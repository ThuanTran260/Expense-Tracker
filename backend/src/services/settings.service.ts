import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';

export const settingsService = {
  /**
   * Lấy cấu hình của user.
   * Nếu chưa có (trường hợp hiếm) → tạo mặc định.
   */
  async getSettings(userId: string) {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        theme: 'LIGHT',
        currency: 'VND',
        language: 'vi',
        alertThreshold: 0.8,
      },
    });
    return settings;
  },

  /**
   * Cập nhật cấu hình người dùng.
   * Chỉ cập nhật các field được gửi lên (partial update).
   */
  async updateSettings(
    userId: string,
    data: {
      theme?: 'LIGHT' | 'DARK';
      currency?: 'VND' | 'USD';
      language?: string;
      alertThreshold?: number;
    }
  ) {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        theme: data.theme ?? 'LIGHT',
        currency: data.currency ?? 'VND',
        language: data.language ?? 'vi',
        alertThreshold: data.alertThreshold ?? 0.8,
      },
    });
    return settings;
  },
};
