import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { AppError } from './errorHandler.js';

export default function authtenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Missing or invalid token', 401));
  }
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return next(new AppError('UNAUTHORIZED', 'Missing or invalid token', 401));
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    return next(new AppError('INVALID_TOKEN', 'Invalid or expired token', 401));
  }
}
