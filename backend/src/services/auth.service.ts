import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';
import { AuthPayload } from '../middlewares/auth';

const BCRYPT_ROUNDS = 12;

/**
 * Refresh token lưu DB ở dạng hash SHA-256 (không plain) — nếu DB bị lộ,
 * attacker không có token usable để dùng ngay.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Dọn token hết hạn — best-effort, không được làm hỏng auth flow */
async function purgeExpiredTokens(): Promise<void> {
  try {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    // bỏ qua — dọn dẹp thất bại không chặn đăng nhập/refresh
  }
}

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

// ─────────────────────────────────────────────
// TOKEN HELPERS
// ─────────────────────────────────────────────
function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, getEnv('JWT_ACCESS_SECRET'), {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as any) || '15m',
  });
}

function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, getEnv('JWT_REFRESH_SECRET'), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || '7d',
  });
}

// ─────────────────────────────────────────────
// AUTH SERVICE
// ─────────────────────────────────────────────
export const authService = {
  /**
   * Đăng ký user mới.
   * Tự động tạo UserSettings mặc định kèm theo.
   */
  async register(name: string, email: string, password: string) {
    // Kiểm tra email đã tồn tại chưa
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw AppError.conflict('Email này đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Transaction: tạo user + settings trong 1 lần
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          // Tự động tạo UserSettings mặc định (1-1)
          settings: {
            create: {
              theme: 'LIGHT',
              currency: 'VND',
              language: 'vi',
              alertThreshold: 0.8,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          settings: true,
        },
      });
      return newUser;
    });

    const payload: AuthPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Lưu refresh token vào DB (hash) để hỗ trợ logout + reuse detection
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.refreshToken.create({
      data: { token: hashToken(refreshToken), userId: user.id, expiresAt },
    });

    void purgeExpiredTokens();

    return { user, accessToken, refreshToken };
  },

  /**
   * Đăng nhập — trả về accessToken + refreshToken.
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        createdAt: true,
        settings: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('Email hoặc mật khẩu không chính xác');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Email hoặc mật khẩu không chính xác');
    }

    const payload: AuthPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Lưu refresh token (hash)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: hashToken(refreshToken), userId: user.id, expiresAt },
    });

    void purgeExpiredTokens();

    // Không trả passwordHash trong response
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },

  /**
   * Refresh: đổi refreshToken (từ cookie) lấy accessToken mới + ROTATE refresh token.
   * - Token cũ bị xóa khỏi DB ngay (one-time use) → token bị đánh cắp chỉ dùng được 1 lần.
   * - Lưu ý edge case: 2 tab refresh cùng lúc → tab thua race nhận 401 và phải login lại
   *   (hiếm, tự hồi phục; frontend đã có hàng đợi refresh trong cùng 1 tab).
   */
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw AppError.unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: hashToken(refreshToken) },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    let payload: AuthPayload;
    try {
      payload = jwt.verify(refreshToken, getEnv('JWT_REFRESH_SECRET')) as AuthPayload;
    } catch {
      throw AppError.unauthorized('Refresh token không hợp lệ');
    }

    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // ROTATION: vô hiệu token cũ, cấp token mới (lưu hash)
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token: stored.token } }),
      prisma.refreshToken.create({
        data: {
          token: hashToken(newRefreshToken),
          userId: stored.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    void purgeExpiredTokens();

    return { accessToken, refreshToken: newRefreshToken };
  },

  /**
   * Logout — xóa refreshToken khỏi DB (revoke, so khớp theo hash).
   */
  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: hashToken(refreshToken) } });
    }
  },

  /**
   * Lấy thông tin user hiện tại.
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        settings: true,
      },
    });

    if (!user) throw AppError.notFound('Người dùng không tồn tại');
    return user;
  },
};
