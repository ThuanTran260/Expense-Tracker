const { PrismaClient, TransactionType } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  // EXPENSE categories
  { name: 'Ăn uống',      type: TransactionType.EXPENSE, icon: '🍜', isDefault: true },
  { name: 'Di chuyển',    type: TransactionType.EXPENSE, icon: '🚗', isDefault: true },
  { name: 'Mua sắm',      type: TransactionType.EXPENSE, icon: '🛒', isDefault: true },
  { name: 'Giải trí',     type: TransactionType.EXPENSE, icon: '🎮', isDefault: true },
  { name: 'Sức khỏe',     type: TransactionType.EXPENSE, icon: '🏥', isDefault: true },
  { name: 'Học tập',      type: TransactionType.EXPENSE, icon: '📚', isDefault: true },
  { name: 'Hóa đơn',      type: TransactionType.EXPENSE, icon: '💡', isDefault: true },
  { name: 'Du lịch',      type: TransactionType.EXPENSE, icon: '✈️', isDefault: true },
  { name: 'Quần áo',      type: TransactionType.EXPENSE, icon: '👕', isDefault: true },
  { name: 'Khác (Chi)',   type: TransactionType.EXPENSE, icon: '📌', isDefault: true },

  // INCOME categories
  { name: 'Lương',        type: TransactionType.INCOME,  icon: '💼', isDefault: true },
  { name: 'Thưởng',       type: TransactionType.INCOME,  icon: '🎁', isDefault: true },
  { name: 'Freelance',    type: TransactionType.INCOME,  icon: '💻', isDefault: true },
  { name: 'Đầu tư',       type: TransactionType.INCOME,  icon: '📈', isDefault: true },
  { name: 'Khác (Thu)',   type: TransactionType.INCOME,  icon: '💰', isDefault: true },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const cat of DEFAULT_CATEGORIES) {
    const id = `default-${cat.type.toLowerCase()}-${cat.name}`;
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId: null,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        isDefault: cat.isDefault,
      },
    });
  }

  console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} default categories`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
