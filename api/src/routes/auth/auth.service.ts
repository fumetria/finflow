import bcrypt from "bcryptjs"
import { db } from "../../db/index.js"
import { users } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { signToken } from "../../lib/jwt.js"
import { AppError } from "../../middlewares/errorHandler.js"
import type { RegisterBody, LoginBody } from "./auth.schemas.js"

export async function register(body: RegisterBody) {
    const existUser = await db.select().from(users).where(eq(users.email, body.email))
    if (existUser.length > 0) {
        throw new AppError('EMAIL_TAKEN', 'Email already in use', 409)
    }
    const userEmail = body.email.toLowerCase()
    const hashedPassword = await bcrypt.hash(body.password, 10)
    const [user] = await db.insert(users).values({ email: userEmail, passwordHash: hashedPassword }).returning()
    if (user) {
        return signToken({ sub: user.id, email: user.email, role: user.role })
    }
    throw new AppError('REGISTRATION_FAILED', 'Failed to register user', 500)
}

export async function login(body: LoginBody) {
    const [user] = await db.select().from(users).where(eq(users.email, body.email))
    if (!user) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
    }

    const isOk = await bcrypt.compare(body.password, user.passwordHash)
    if (!isOk) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
    }
    return signToken({ sub: user.id, email: user.email, role: user.role })
}
