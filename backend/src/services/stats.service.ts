import { prisma } from '../lib/prisma';

interface DateFilter {
  from?: string;
  to?: string;
}

function buildDateWhere(filter: DateFilter) {
  const dateWhere: any = {};
  if (filter.from) dateWhere.gte = new Date(filter.from);
  if (filter.to) dateWhere.lte = new Date(filter.to);
  return Object.keys(dateWhere).length > 0 ? dateWhere : undefined;
}

export const statsService = {
  /**
   * Tổng thu, tổng chi, số dư trong khoảng thời gian.
   */
  async getSummary(userId: string, filter: DateFilter) {
    const dateWhere = buildDateWhere(filter);
    const where: any = { userId };
    if (dateWhere) where.date = dateWhere;

    const [incomeResult, expenseResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeResult._sum.amount ?? 0;
    const totalExpense = expenseResult._sum.amount ?? 0;
    const balance = totalIncome - totalExpense;

    return { totalIncome, totalExpense, balance };
  },

  /**
   * Thống kê chi tiêu / thu nhập theo danh mục.
   */
  async getByCategory(
    userId: string,
    filter: DateFilter & { type?: 'INCOME' | 'EXPENSE' }
  ) {
    const dateWhere = buildDateWhere(filter);
    const where: any = { userId };
    if (dateWhere) where.date = dateWhere;
    if (filter.type) where.type = filter.type;

    const grouped = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const total = grouped.reduce((sum: number, g: typeof grouped[0]) => sum + (g._sum.amount ?? 0), 0);

    // Enrich với category info
    const categoryIds = grouped.map((g) => g.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, type: true },
    });
    const catMap = new Map(categories.map((c: typeof categories[0]) => [c.id, c]));

    return grouped.map((g: typeof grouped[0]) => ({
      category: catMap.get(g.categoryId),
      total: g._sum.amount ?? 0,
      percentage: total > 0 ? Math.round(((g._sum.amount ?? 0) / total) * 100) : 0,
    }));
  },

  /**
   * Xu hướng thu/chi theo khoảng thời gian (tháng/ngày).
   */
  async getTimeline(
    userId: string,
    filter: DateFilter & { interval?: 'day' | 'week' | 'month' }
  ) {
    const dateWhere = buildDateWhere(filter);
    const where: any = { userId };
    if (dateWhere) where.date = dateWhere;

    const transactions = await prisma.transaction.findMany({
      where,
      select: { amount: true, type: true, date: true },
      orderBy: { date: 'asc' },
    });

    // Group theo tháng
    const map = new Map<string, { period: string; income: number; expense: number }>();

    for (const t of transactions) {
      let key: string;
      const d = t.date;
      if (filter.interval === 'day') {
        key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }

      if (!map.has(key)) {
        map.set(key, { period: key, income: 0, expense: 0 });
      }

      const entry = map.get(key)!;
      if (t.type === 'INCOME') entry.income += t.amount;
      else entry.expense += t.amount;
    }

    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  },
};
