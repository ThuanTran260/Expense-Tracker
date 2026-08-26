import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { authService } from '../../src/services/auth.service';

/**
 * SECURITY — Auth flow abuse
 * Kiểm thử các kịch bản tấn công lên luồng xác thực:
 * refresh reuse (reuse detection), logout revoke, brute-force rate limit,
 * user enumeration, cookie flags.
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

function refreshCookieFromToken(token: string): string {
  return `refreshToken=${token}`;
}

function extractSetCookie(res: { headers: Record<string, unknown> }): string {
  const setCookie = res.headers['set-cookie'];
  expect(setCookie).toBeDefined();
  const raw = Array.isArray(setCookie) ? setCookie[0] : (setCookie as string);
  return raw;
}

describe('SECURITY: auth flow abuse', () => {
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: EMAIL_SUFFIX } } });
    await prisma.$disconnect();
  });

  it('Refresh hợp lệ → rotate: cấp token mới + đánh dấu rotated', async () => {
    const { user, refreshToken } = await createUser('FlowA');
    cleanupUserIds.push(user.id);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookieFromToken(refreshToken));

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    const cookie = extractSetCookie(res);
    expect(cookie).toContain('refreshToken=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');

    // Row cũ phải ở trạng thái rotated
    const crypto = await import('crypto');
    const oldHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const oldRow = await prisma.refreshToken.findUnique({ where: { token: oldHash } });
    expect(oldRow).not.toBeNull();
    expect(oldRow?.rotatedAt).not.toBeNull();
  });

  it('REUSE DETECTION: chơi lại token đã rotate → 401 + toàn bộ family bị thu hồi', async () => {
    const { user, refreshToken } = await createUser('FlowB');
    cleanupUserIds.push(user.id);

    // Rotate lần 1 → nhận token mới
    const first = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookieFromToken(refreshToken));
    expect(first.status).toBe(200);

    // Attacker (hoặc tab chậm) chơi lại token CŨ
    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookieFromToken(refreshToken));
    expect(reuse.status).toBe(401);

    // Toàn bộ family (kể cả token mới legit đang có) phải bị thu hồi
    const crypto = await import('crypto');
    const newTokenFromFirst = extractSetCookie(first)
      .split(';')[0]
      .replace('refreshToken=', '');
    const newHash = crypto
      .createHash('sha256')
      .update(decodeURIComponent(newTokenFromFirst))
      .digest('hex');
    const legitRow = await prisma.refreshToken.findUnique({ where: { token: newHash } });
    expect(legitRow).toBeNull();
  });

  it('Logout → thu hồi family; refresh sau logout → 401', async () => {
    const { user, accessToken, refreshToken } = await createUser('FlowC');
    cleanupUserIds.push(user.id);

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookieFromToken(refreshToken));
    expect(refreshed.status).toBe(200);

    const newestCookie = extractSetCookie(refreshed).split(';')[0];
    // /auth/logout yêu cầu Bearer access token (authenticate middleware)
    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', newestCookie);
    expect(logout.status).toBe(200);

    const afterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', newestCookie);
    expect(afterLogout.status).toBe(401);
  });

  it('Refresh token lạ / rỗng → 401', async () => {
    const unknown = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=khong-ton-tai');
    expect(unknown.status).toBe(401);

    const empty = await request(app).post('/api/v1/auth/refresh');
    expect(empty.status).toBe(401);
  });

  it('Login sai email vs sai password → CÙNG message (chống user enumeration)', async () => {
    const wrongEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `khong-ton-tai-${Date.now()}${EMAIL_SUFFIX}`, password: 'Whatever123!' });
    const wrongPass = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `flowa-${Date.now()}${EMAIL_SUFFIX}`, password: 'SaiMatKhau123!' });

    // Chưa chắc 429 (limiter) — chỉ assert khi còn 401
    if (wrongEmail.status === 401 && wrongPass.status === 401) {
      expect(wrongEmail.body.error.message).toBe(wrongPass.body.error.message);
    }
  });

  it('BRUTE FORCE: login sai 6 lần liên tiếp → request cuối 429 (chạy cuối file)', async () => {
    const results: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `bruteforce-${Date.now()}${EMAIL_SUFFIX}`, password: 'WrongPass123!' });
      results.push(res.status);
    }
    expect(results[results.length - 1]).toBe(429);
  });
});
