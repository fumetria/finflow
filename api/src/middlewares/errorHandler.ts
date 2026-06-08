import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
    constructor(
        public readonly code: string,
        public override message: string,
        public readonly statusCode: number = 400,
    ) {
        super(message)
    }
}

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ code: err.code, message: err.message });
        return;
    }
    console.error(err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}