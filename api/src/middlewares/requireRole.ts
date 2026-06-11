import { AppError } from './errorHandler.js'
import type { Request, Response, NextFunction } from 'express'

export function requireRole(role: 'admin' | 'user') {

    return function (req: Request, res: Response, next: NextFunction): void {
        if (req.user.role !== role) {
            return next(new AppError('FORBIDDEN', 'Access denied', 403))
        }
        next()
    }
}