import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'

type JwtPayload = {
    sub: string;
    email: string;
    role: 'admin' | 'user';
}
export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions)
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}