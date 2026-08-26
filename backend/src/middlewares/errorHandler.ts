import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../lib/logger';

/**
 * Global error handler middleware.
 * Phải đặt CUỐI CÙNG trong Express app (sau tất cả routes).
 * Không bao giờ lộ stack trace ra production response.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod validation error
  if (err instanceof ZodError) {
    const messages = err.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: messages,
      },
    });
    return;
  }

  // 2. Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // 2b. body-parser: payload vượt giới hạn → 413 (không rơi vào 500)
  if ((err as any)?.type === 'entity.too.large' || (err as any)?.statusCode === 413) {
    res.status(413).json({
      error: {
        code: ErrorCode.PAYLOAD_TOO_LARGE,
        message: 'Payload quá lớn',
      },
    });
    return;
  }

  // 3. Unknown / unhandled error
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: {
      code: ErrorCode.SERVER_ERROR,
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
    },
  });
}

/**
 * 404 handler — đặt trước errorHandler, sau tất cả routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
