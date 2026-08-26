import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { authService } from '../../src/services/auth.service';

/**
 * SECURITY — IDOR / Authorization matrix
 * Invariant bảo mật cốt lõi (AGENTS.md): mọi record chỉ truy cập được bởi owner.
 * User A mang token hợp lệ phải bị chặn (403/404) trên MỌI resource của user B,
 * và vẫn phải đọc được resource của chính A (không over-block).
 */

const EMAIL_SUFFIX = '@sec-test.local';

// Supabase remote DB + bcrypt 12 rounds → hook cần nhiều hơn 5s mặc định
jest.setTimeout(30000);

async function createUser(name: string) {
  const email = `${name.toLowerCase()}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}${EMAIL_SUFFIX}`;
  return authService.register(name, email, 'SecurePass123!');
}

async function createTransaction(token: string, categoryId: string, note?: string) {
  const res = await request(app)
    .post('/api/v1/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      amount: 150000,
      type: 'EXPENSE',
      categoryId,
      note,
      date: new Date().toISOString(),
    });
  expect(res.status).toBe(201);
  return res.body.transaction as { id: string };
}

async function getFirstSystemCategoryId(token: string): Promise<string> {
  const res = await request(app)
    .get('/api/v1/categories')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  const list = res.body.data as Array<{ id: string; userId: string | null }>;
  const system = list.find((c) => c.userId === null);
  expect(system).toBeDefined();
  return system!.id;
}

describe('SECURITY: IDOR / authorization matrix', () => {
  let tokenA: string;
  let tokenB: string;
  let txnIdB: string;
  let txnIdA: string;
  let budgetIdB: string;
  let categoryIdB: string;
  const cleanupUserIds: string[] = [];

  beforeAll(async () => {
    const a = await createUser('Alice');
    const b = await createUser('Bob');
    tokenA = a.accessToken;
    tokenB = b.accessToken;
    cleanupUserIds.push(a.user.id, b.user.id);

    const systemCategoryId = await getFirstSystemCategoryId(tokenB);

    // B tạo data của B
    txnIdB = (await createTransaction(tokenB, systemCategoryId, 'data-cua-B')).id;
    const catRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: `B-Cat-${Date.now()}`, type: 'EXPENSE' });
    expect(catRes.status).toBe(201);
    categoryIdB = catRes.body.category.id;

    const budgetRes = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        categoryId: systemCategoryId,
        monthlyLimit: 2000000,
        month: 8,
        year: 2026,
      });
    expect(budgetRes.status).toBe(201);
    budgetIdB = budgetRes.body.budget.id;

    // A tạo data của A (kiểm tra không over-block)
    const systemCategoryIdA = await getFirstSystemCategoryId(tokenA);
    txnIdA = (await createTransaction(tokenA, systemCategoryIdA, 'data-cua-A')).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
    await prisma.$disconnect();
  });

  it('A GET transaction của B → bị chặn', async () => {
    const res = await request(app)
      .get(`/api/v1/transactions/${txnIdB}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect([403, 404]).toContain(res.status);
  });

  it('A PUT transaction của B → bị chặn', async () => {
    const res = await request(app)
      .put(`/api/v1/transactions/${txnIdB}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 1 });
    expect([403, 404]).toContain(res.status);
  });

  it('A DELETE transaction của B → bị chặn', async () => {
    const res = await request(app)
      .delete(`/api/v1/transactions/${txnIdB}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect([403, 404]).toContain(res.status);
    // Đảm bảo chưa bị xóa thật
    const stillThere = await prisma.transaction.findUnique({ where: { id: txnIdB } });
    expect(stillThere).not.toBeNull();
  });

  it('A PUT budget của B → bị chặn', async () => {
    const res = await request(app)
      .put(`/api/v1/budgets/${budgetIdB}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ monthlyLimit: 1 });
    expect([403, 404]).toContain(res.status);
  });

  it('A DELETE category custom của B → bị chặn', async () => {
    const res = await request(app)
      .delete(`/api/v1/categories/${categoryIdB}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect([403, 404]).toContain(res.status);
  });

  it('A PUT settings KHÔNG được ảnh hưởng settings của B', async () => {
    const settingsBefore = await prisma.userSettings.findUnique({
      where: { userId: cleanupUserIds[1] },
    });
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ theme: 'DARK', currency: 'USD', language: 'en', alertThreshold: 0.5 });
    expect(res.status).toBe(200);

    const settingsAfter = await prisma.userSettings.findUnique({
      where: { userId: cleanupUserIds[1] },
    });
    expect(settingsAfter?.theme).toBe(settingsBefore?.theme);
    expect(settingsAfter?.currency).toBe(settingsBefore?.currency);
  });

  it('List transactions của A không chứa transaction của B', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(txnIdB);
    expect(body).not.toContain('data-cua-B');
  });

  it('A vẫn đọc/được transaction của chính A (không over-block)', async () => {
    const res = await request(app)
      .get(`/api/v1/transactions/${txnIdA}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.transaction.id).toBe(txnIdA);
  });

  it('Không token → 401; token giả mạo → 401', async () => {
    const noToken = await request(app).get(`/api/v1/transactions/${txnIdA}`);
    expect(noToken.status).toBe(401);

    const fake = await request(app)
      .get(`/api/v1/transactions/${txnIdA}`)
      .set('Authorization', 'Bearer fake.token.value');
    expect(fake.status).toBe(401);
  });
});
