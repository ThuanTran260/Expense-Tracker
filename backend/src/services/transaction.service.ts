import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';

interface TransactionFilter {
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const transactionService = {
  /**
   * Lấy danh sách giao dịch có phân trang + filter.
   */
  async getTransactions(userId: string, filter: TransactionFilter) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (filter.type) where.type = filter.type;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.from || filter.to) {
      where.date = {};
      if (filter.from) where.date.gte = new Date(filter.from);
      if (filter.to) where.date.lte = new Date(filter.to);
    }
    if (filter.search) {
      where.note = { contains: filter.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          category: { select: { id: true, name: true, icon: true, type: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Lấy 1 giao dịch theo ID (chỉ của user hiện tại).
   */
  async getTransactionById(userId: string, id: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
      },
    });

    if (!transaction) throw AppError.notFound('Giao dịch không tồn tại');
    if (transaction.userId !== userId) throw AppError.forbidden('Không có quyền truy cập giao dịch này');

    return transaction;
  },

  /**
   * Tạo giao dịch mới.
   */
  async createTransaction(
    userId: string,
    data: {
      amount: number;
      type: 'INCOME' | 'EXPENSE';
      categoryId: string;
      note?: string;
      date: string;
    }
  ) {
    // Xác minh category thuộc về user hoặc là system default
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) throw AppError.notFound('Danh mục không tồn tại');
    if (category.userId !== null && category.userId !== userId) {
      throw AppError.forbidden('Danh mục không hợp lệ');
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        categoryId: data.categoryId,
        amount: data.amount,
        type: data.type,
        note: data.note,
        date: new Date(data.date),
      },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
      },
    });

    return transaction;
  },

  /**
   * Cập nhật giao dịch (chỉ của user hiện tại).
   */
  async updateTransaction(
    userId: string,
    id: string,
    data: Partial<{
      amount: number;
      type: 'INCOME' | 'EXPENSE';
      categoryId: string;
      note: string;
      date: string;
    }>
  ) {
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) throw AppError.notFound('Giao dịch không tồn tại');
    if (transaction.userId !== userId) throw AppError.forbidden('Không có quyền sửa giao dịch này');

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
      },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
      },
    });

    return updated;
  },

  /**
   * Xóa giao dịch (chỉ của user hiện tại).
   */
  async deleteTransaction(userId: string, id: string) {
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) throw AppError.notFound('Giao dịch không tồn tại');
    if (transaction.userId !== userId) throw AppError.forbidden('Không có quyền xóa giao dịch này');

    await prisma.transaction.delete({ where: { id } });
  },

  /**
   * Export giao dịch ra CSV string.
   */
  async exportToCSV(userId: string, filter: Omit<TransactionFilter, 'page' | 'limit'>) {
    const where: any = { userId };

    if (filter.type) where.type = filter.type;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.from || filter.to) {
      where.date = {};
      if (filter.from) where.date.gte = new Date(filter.from);
      if (filter.to) where.date.lte = new Date(filter.to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        category: { select: { name: true, type: true } },
      },
    });

    // Build CSV
    const header = 'Ngày,Loại,Danh mục,Số tiền,Ghi chú\n';
    const rows = transactions.map((t) => {
      const date = t.date.toISOString().split('T')[0];
      const type = t.type === 'INCOME' ? 'Thu' : 'Chi';
      const category = t.category.name;
      const amount = t.amount.toString();
      const note = `"${(t.note ?? '').replace(/"/g, '""')}"`;
      return `${date},${type},${category},${amount},${note}`;
    });

    return header + rows.join('\n');
  },
};
