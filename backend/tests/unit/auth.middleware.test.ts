import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middlewares/auth';
import { AppError } from '../../src/utils/errors';

const TEST_SECRET = 'test-access-secret-min-32-chars-long';
process.env.JWT_ACCESS_SECRET = TEST_SECRET;

describe('Auth Middleware Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {};
    nextFn = jest.fn();
  });

  it('should call next with unauthorized error if authorization header is missing', () => {
    authenticate(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalledWith(expect.any(AppError));
    const error = nextFn.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  it('should call next with error if token format is not Bearer', () => {
    mockReq.headers = { authorization: 'Basic some-token' };

    authenticate(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('should attach user payload to request if token is valid', () => {
    const payload = { userId: 'user-123', email: 'test@example.com' };
    const token = jwt.sign(payload, TEST_SECRET);

    mockReq.headers = { authorization: `Bearer ${token}` };

    authenticate(mockReq as Request, mockRes as Response, nextFn);

    expect(mockReq.user).toEqual(expect.objectContaining(payload));
    expect(nextFn).toHaveBeenCalledWith();
  });
});
