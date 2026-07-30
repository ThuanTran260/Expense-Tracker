import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export interface AuthPayload {
  userId: string;
  email: string;
}

// Extend Express Request để thêm user field
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * JWT Authentication Middleware.
 * Kiểm tra Authorization: Bearer <accessToken> header.
 * Nếu hợp lệ → gán req.user và gọi next().
 * Nếu không hợp lệ → throw 401.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Access token missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET not configured');
    }

    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized('Invalid or expired access token'));
    } else {
      next(err);
    }
  }
}
