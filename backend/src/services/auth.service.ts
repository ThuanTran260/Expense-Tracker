import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';
import { AuthPayload } from '../middlewares/auth';

const BCRYPT_ROUNDS = 12;

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

    // Lưu refresh token vào DB để hỗ trợ logout
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

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

    // Lưu refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    // Không trả passwordHash trong response
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },

  /**
   * Refresh: đổi refreshToken (từ cookie) lấy accessToken mới.
   */
  async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
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
    return { accessToken };
  },

  /**
   * Logout — xóa refreshToken khỏi DB (revoke).
   */
  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
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
