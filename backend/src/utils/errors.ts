// Centralized error codes dùng chung toàn hệ thống
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// Custom AppError class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(message: string, statusCode: number, code: ErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403, ErrorCode.FORBIDDEN);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, ErrorCode.NOT_FOUND);
  }

  static conflict(message = 'Conflict') {
    return new AppError(message, 409, ErrorCode.CONFLICT);
  }

  static validation(message = 'Validation error') {
    return new AppError(message, 400, ErrorCode.VALIDATION_ERROR);
  }
}
