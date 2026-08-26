import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';
import { AuthPayload } from '../middlewares/auth';

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ROTATED_RETENTION_MS = 24 * 60 * 60 * 1000; // giữ rotated rows 24h làm reuse evidence

/**
 * Refresh token lưu DB ở dạng hash SHA-256 (không plain) — nếu DB bị lộ,
 * attacker không có token usable để dùng ngay.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Refresh token là OPAQUE (random 48 bytes base64url) — không phải JWT:
 * - Không encode userId/email vào token
 * - DB là nguồn chân lý duy nhất; bỏ jwt.verify cho refresh flow
 */
function generateOpaqueRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Dọn token hết hạn + rotated rows quá 24h — best-effort, không làm hỏng auth flow.
 * LƯU Ý serverless: caller phải await (fire-and-forget sẽ bị freeze giữa chừng).
 */
async function purgeExpiredTokens(): Promise<void> {
  try {
    const now = Date.now();
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date(now) } },
          { rotatedAt: { lt: new Date(now - ROTATED_RETENTION_MS) } },
        ],
      },
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
    const refreshToken = generateOpaqueRefreshToken();
    const familyId = crypto.randomUUID(); // mỗi login = 1 family mới (cách ly theo thiết bị)

    // Lưu refresh token vào DB (hash) — family phục vụ reuse detection + logout sạch
    await prisma.refreshToken.create({
      data: {
        token: hashToken(refreshToken),
        userId: user.id,
        familyId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    await purgeExpiredTokens();

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
    const refreshToken = generateOpaqueRefreshToken();
    const familyId = crypto.randomUUID();

    // Lưu refresh token (hash)
    await prisma.refreshToken.create({
      data: {
        token: hashToken(refreshToken),
        userId: user.id,
        familyId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    await purgeExpiredTokens();

    // Không trả passwordHash trong response
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },

  /**
   * Refresh: đổi refreshToken (opaque, từ cookie) lấy accessToken mới + ROTATE.
   * - Rotate: row cũ đánh dấu rotatedAt (giữ làm reuse evidence), cấp token mới cùng family.
   * - REUSE DETECTION: token đã rotated bị dùng lại → coi như đánh cắp → thu hồi TOÀN BỘ family.
   * - Edge case multi-tab: frontend serialize refresh bằng Web Locks API; nếu 2 request
   *   vẫn lọt qua thì tab thua nhận 401 và phải login lại (hiếm, tự hồi phục).
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

    if (stored.rotatedAt) {
      // Token one-time use bị chơi lại → giả định bị đánh cắp → kill cả family
      await prisma.refreshToken.deleteMany({ where: { familyId: stored.familyId } });
      throw AppError.unauthorized('Phiên đăng nhập đã bị thu hồi do phát hiện bất thường');
    }

    // Opaque token: payload lấy từ DB, không decode được từ token
    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true },
    });
    if (!user) {
      await prisma.refreshToken.deleteMany({ where: { familyId: stored.familyId } });
      throw AppError.unauthorized('Refresh token không hợp lệ');
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = generateOpaqueRefreshToken();

    // ROTATION: đánh dấu token cũ + cấp token mới cùng family (lưu hash)
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { token: stored.token },
        data: { rotatedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          token: hashToken(newRefreshToken),
          userId: stored.userId,
          familyId: stored.familyId,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
      }),
    ]);

    await purgeExpiredTokens();

    return { accessToken, refreshToken: newRefreshToken };
  },

  /**
   * Logout — thu hồi cả family của phiên này (các token đã rotated trong chuỗi cũng sạch).
   * Không đụng family khác → đăng xuất 1 thiết bị không ảnh hưởng thiết bị khác.
   */
  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const stored = await prisma.refreshToken.findUnique({
      where: { token: hashToken(refreshToken) },
    });
    if (stored) {
      await prisma.refreshToken.deleteMany({ where: { familyId: stored.familyId } });
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
