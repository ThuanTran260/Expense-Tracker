import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';

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
