import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';

export const categoryService = {
  /**
   * Lấy danh sách danh mục:
   * - Danh mục mặc định hệ thống (userId = null)
   * - Danh mục riêng của user (userId = userId)
   */
  async getCategories(userId: string) {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: null },   // system defaults
          { userId: userId }, // user's own categories
        ],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return categories;
  },

  /**
   * Tạo danh mục mới cho user.
   */
  async createCategory(
    userId: string,
    data: { name: string; type: 'INCOME' | 'EXPENSE'; icon?: string }
  ) {
    const category = await prisma.category.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        icon: data.icon,
        isDefault: false,
      },
    });
    return category;
  },

  /**
   * Xóa danh mục của user.
   * Không cho phép xóa danh mục mặc định hệ thống.
   */
  async deleteCategory(userId: string, categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw AppError.notFound('Danh mục không tồn tại');
    }

    if (category.userId !== userId) {
      throw AppError.forbidden('Bạn không có quyền xóa danh mục này');
    }

    if (category.isDefault) {
      throw AppError.forbidden('Không thể xóa danh mục mặc định của hệ thống');
    }

    await prisma.category.delete({ where: { id: categoryId } });
  },
};
