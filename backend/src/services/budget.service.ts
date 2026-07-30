import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';

export const budgetService = {
  /**
   * Lấy danh sách budget của tháng, kèm tổng đã chi và % so với hạn mức.
   */
  async getBudgets(userId: string, month: number, year: number) {
    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
      },
    });

    // Tính tổng đã chi cho mỗi budget
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const enriched = await Promise.all(
      budgets.map(async (budget) => {
        const result = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        const spent = result._sum.amount ?? 0;
        const remaining = budget.monthlyLimit - spent;
        const percent = budget.monthlyLimit > 0
          ? Math.round((spent / budget.monthlyLimit) * 100)
          : 0;

        return { ...budget, spent, remaining, percent };
      })
    );

    return enriched;
  },

  /**
   * Tạo budget mới (mỗi category/tháng chỉ có 1).
   */
  async createBudget(
    userId: string,
    data: {
      categoryId: string;
      monthlyLimit: number;
      month: number;
      year: number;
    }
  ) {
    // Kiểm tra category hợp lệ
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) throw AppError.notFound('Danh mục không tồn tại');
    if (category.userId !== null && category.userId !== userId) {
      throw AppError.forbidden('Danh mục không hợp lệ');
    }

    try {
      const budget = await prisma.budget.create({
        data: { ...data, userId },
        include: {
          category: { select: { id: true, name: true, icon: true, type: true } },
        },
      });
      return budget;
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw AppError.conflict('Đã có ngân sách cho danh mục này trong tháng được chọn');
      }
      throw e;
    }
  },

  /**
   * Cập nhật hạn mức budget.
   */
  async updateBudget(userId: string, id: string, monthlyLimit: number) {
    const budget = await prisma.budget.findUnique({ where: { id } });
    if (!budget) throw AppError.notFound('Ngân sách không tồn tại');
    if (budget.userId !== userId) throw AppError.forbidden('Không có quyền sửa ngân sách này');

    return prisma.budget.update({
      where: { id },
      data: { monthlyLimit },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
      },
    });
  },

  /**
   * Xóa budget.
   */
  async deleteBudget(userId: string, id: string) {
    const budget = await prisma.budget.findUnique({ where: { id } });
    if (!budget) throw AppError.notFound('Ngân sách không tồn tại');
    if (budget.userId !== userId) throw AppError.forbidden('Không có quyền xóa ngân sách này');

    await prisma.budget.delete({ where: { id } });
  },
};
