import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { authService } from '../../src/services/auth.service';

/**
 * SECURITY — Input fuzzing / malicious payloads
 * Mọi input độc phải bị Zod chặn (400) hoặc Prisma parameterize nuốt sạch —
 * không bao giờ 500 (crash), không bao giờ thực thi.
 * Domain tài chính: amount dương, VND nguyên, date ISO 8601.
 */

const EMAIL_SUFFIX = '@sec-test.local';

// Supabase remote DB + payload lớn cần nhiều hơn 5s mặc định
jest.setTimeout(30000);

async function createUserWithCategory() {
  const email = `fuzz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${EMAIL_SUFFIX}`;
  const { user, accessToken } = await authService.register('Fuzzer', email, 'SecurePass123!');
  // Hermetic: tự tạo category hệ thống (CI test DB không có seed)
  const sysCat = await prisma.category.create({
    data: { name: `fuzz-sys-${Date.now()}`, type: 'EXPENSE', userId: null },
  });
  return { user, accessToken, categoryId: sysCat.id, sysCategoryId: sysCat.id };
}

function txnBody(overrides: Record<string, unknown>, categoryId: string) {
  return {
    amount: 50000,
    type: 'EXPENSE',
    categoryId,
    date: new Date().toISOString(),
    ...overrides,
  };
}

describe('SECURITY: input fuzzing', () => {
  let token: string;
  let categoryId: string;
  let cleanupUserId: string;
  let sysCategoryId: string;

  beforeAll(async () => {
    const ctx = await createUserWithCategory();
    token = ctx.accessToken;
    categoryId = ctx.categoryId;
    sysCategoryId = ctx.sysCategoryId;
    cleanupUserId = ctx.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: cleanupUserId } });
    await prisma.category.deleteMany({ where: { id: sysCategoryId } });
    await prisma.$disconnect();
  });

  const expectNot500 = (status: number) => {
    expect(status).not.toBe(500);
  };

  it('SQL injection strings → bị nuốt (không 500, không thực thi)', async () => {
    const payloads = [
      "'; DROP TABLE transactions;--",
      "' OR '1'='1",
      "1; DELETE FROM users",
      "%%'; SELECT pg_sleep(10);--",
    ];
    for (const note of payloads) {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(txnBody({ note }, categoryId));
      expectNot500(res.status);
      expect([201, 400]).toContain(res.status);
    }
    // Bảng users vẫn nguyên vẹn
    const users = await prisma.user.count();
    expect(users).toBeGreaterThan(0);
  });

  it('XSS payload trong note → lưu dạng data (JSON), không thực thi ở API layer', async () => {
    const xss = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(txnBody({ note: xss }, categoryId));
    // API trả JSON — client React escape khi render; assert không 500 và data nguyên văn
    expect([201, 400]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.transaction.note).toBe(xss);
    }
  });

  it('Sai kiểu dữ liệu → 400 VALIDATION_ERROR (không 500)', async () => {
    const cases = [
      { amount: 'mot-trieu' },
      { amount: -5000 },
      { amount: 0 },
      { type: 'ADMIN' },
      { type: 123 },
      { date: 'khong-phai-ngay' },
      { date: '2026-13-45T99:99:99Z' },
      { categoryId: '' },
      { note: 'x'.repeat(501) }, // max 500
    ];
    for (const override of cases) {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(txnBody(override, categoryId));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('Query abuse: limit vượt cap → 400; page âm → 400', async () => {
    const tooBig = await request(app)
      .get('/api/v1/transactions?limit=10000')
      .set('Authorization', `Bearer ${token}`);
    expect(tooBig.status).toBe(400);

    const negative = await request(app)
      .get('/api/v1/transactions?page=-1')
      .set('Authorization', `Bearer ${token}`);
    expect(negative.status).toBe(400);
  });

  it('Prototype pollution keys → bị strip/chặn, app sống sót', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...txnBody({}, categoryId),
        '__proto__': { isAdmin: true },
        'constructor.prototype.polluted': 'yes',
      });
    expectNot500(res.status);
    expect([201, 400]).toContain(res.status);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('Payload khổng lồ (1MB note) → 400, không crash', async () => {
    const huge = 'A'.repeat(1024 * 1024);
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(txnBody({ note: huge }, categoryId));
    expectNot500(res.status);
    expect([400, 413]).toContain(res.status);
  });

  it('Đăng nhập body bẩn → 400 (không 500, không leak)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: { $regex: '.*' }, __proto__: {} });
    // Limiter có thể trả 429 nếu test khác đã đốt — cả 400/429 đều là chặn đúng
    expect([400, 429]).toContain(res.status);
    expectNot500(res.status);
  });
});
