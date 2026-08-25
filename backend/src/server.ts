import 'dotenv/config';
import { z } from 'zod';
import app from './app';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';

// Fail-fast: chặn khởi động nếu env bắt buộc thiếu/yếu (secret < 32 ký tự)
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      logger.error(`❌ Invalid environment: ${issue.message}`);
    }
    throw new Error('Environment validation failed');
  }
}

const PORT = Number(process.env.PORT) || 5000;

async function connectWithRetry(retries = 10, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$connect();
      logger.info('✅ Database connected successfully');
      return;
    } catch (error) {
      logger.warn(`⏳ Waiting for Database connection (attempt ${i}/${retries})...`);
      if (i === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  try {
    // Fail-fast trước khi connect DB
    validateEnv();

    // Kết nối DB có retry
    await connectWithRetry();

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📋 API docs: http://localhost:${PORT}/api/v1`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', { error });
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
