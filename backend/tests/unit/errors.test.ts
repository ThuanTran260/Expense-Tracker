import { AppError, ErrorCode } from '../../src/utils/errors';

describe('AppError Utility Unit Tests', () => {
  it('should create an unauthorized error with 401 status code', () => {
    const err = AppError.unauthorized('Custom unauthorized message');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(err.message).toBe('Custom unauthorized message');
  });

  it('should create a forbidden error with 403 status code', () => {
    const err = AppError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('should create a notFound error with 404 status code', () => {
    const err = AppError.notFound();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('should create a conflict error with 409 status code', () => {
    const err = AppError.conflict('Email exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.CONFLICT);
    expect(err.message).toBe('Email exists');
  });

  it('should create a validation error with 400 status code', () => {
    const err = AppError.validation('Invalid payload');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});
