import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { authService } from '../../src/services/auth.service';
import { errorHandler } from '../../src/middlewares/errorHandler';
import { Response, NextFunction } from 'express';

/**
 * SECURITY — Headers (CORS) & data exposure
 * CORS: chỉ same-origin + allowlist được phản chiếu; origin lạ KHÔNG được ACAO.
 * Exposure: response không bao giờ chứa passwordHash; 500 ẩn message ở production.
 */

const EMAIL_SUFFIX = '@sec-test.local';

async function createUser(name: string) {
  const email = `${name.toLowerCase()}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}${EMAIL_SUFFIX}`;
  return authService.register(name, email, 'SecurePass123!');
}

describe('SECURITY: CORS', () => {
  it('Origin lạ (evil domain) → KHÔNG có Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil-attacker.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('Same-origin (Origin host === request host) → được phép', async () => {
    const res = await request(app)
      .get('/health')
      .set('Host', 'my-app.vercel.app')
      .set('Origin', 'https://my-app.vercel.app');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://my-app.vercel.app');
  });

  it('Origin trong allowlist CORS_ORIGINS mặc định (localhost:5173) → được phép', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('Không có Origin (curl/Postman) → vẫn hoạt động', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});

describe('SECURITY: data exposure', () => {
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: EMAIL_SUFFIX } } });
    await prisma.$disconnect();
  });

  it('/auth/me không bao giờ trả passwordHash', async () => {
    const { user, accessToken } = await createUser('ExposeA');
    cleanupUserIds.push(user.id);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('passwordHash');
    expect(bodyStr).not.toContain('$2a$'); // bcrypt hash pattern
  });

  it('404 handler trả JSON chuẩn, không lộ stack', async () => {
    const res = await request(app).get('/api/v1/khong-ton-tai');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('at ');
    expect(res.body.stack).toBeUndefined();
  });

  it('Zod validation error → 400 + code VALIDATION_ERROR', async () => {
    const { accessToken } = await createUser('ExposeB');
    cleanupUserIds.push(cleanupUserIds[cleanupUserIds.length - 1]);

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 'khong-phai-so', type: 'HACK' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('errorHandler ở production ẩn message nội bộ', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;
      const internalError = new Error('Secret DB connection string: postgresql://...');

      errorHandler(internalError, {} as never, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: expect.any(String), message: 'Internal server error' },
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
