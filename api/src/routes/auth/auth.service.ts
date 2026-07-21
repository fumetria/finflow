import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '../../db/index.js';
import { users, emailVerificationTokens } from '../../db/schema.js';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { signToken } from '../../lib/jwt.js';
import { sendVerificationEmail } from '../../lib/mailer.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type {
  RegisterBody,
  LoginBody,
  VerifyEmailBody,
  ResendVerificationBody,
} from './auth.schemas.js';

// Don't send a second link if one was just issued — cheap throttle against
// someone hammering /resend-verification.
const RESEND_COOLDOWN_MS = 60_000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

// Creates a fresh verification link for the user and mails it. Returns nothing:
// the plain token only ever lives inside the email.
async function issueVerificationToken(userId: string, email: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendVerificationEmail(email, verifyUrl);
}

export async function register(body: RegisterBody) {
  const userEmail = body.email.toLowerCase();
  const existUser = await db.select().from(users).where(eq(users.email, userEmail));
  if (existUser.length > 0) {
    throw new AppError('EMAIL_TAKEN', 'Email already in use', 409);
  }
  const hashedPassword = await bcrypt.hash(body.password, 10);
  const [user] = await db
    .insert(users)
    .values({ email: userEmail, passwordHash: hashedPassword })
    .returning();
  if (!user) {
    throw new AppError('REGISTRATION_FAILED', 'Failed to register user', 500);
  }

  // No token here: the account stays unusable until the emailed link is opened.
  await issueVerificationToken(user.id, user.email);
  return { message: 'Check your inbox to confirm your email address' };
}

export async function login(body: LoginBody) {
  const [user] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const isOk = await bcrypt.compare(body.password, user.passwordHash);
  if (!isOk) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  if (!user.emailVerifiedAt) {
    throw new AppError('EMAIL_NOT_VERIFIED', 'Verify your email before signing in', 403);
  }

  return signToken({ sub: user.id, email: user.email, role: user.role });
}

export async function verifyEmail(body: VerifyEmailBody) {
  const [row] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, hashToken(body.token)));

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AppError(
      'INVALID_VERIFICATION_TOKEN',
      'This verification link is invalid or has expired',
      400,
    );
  }

  const [user] = await db.select().from(users).where(eq(users.id, row.userId));
  if (!user) {
    throw new AppError(
      'INVALID_VERIFICATION_TOKEN',
      'This verification link is invalid or has expired',
      400,
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, row.id));
    // Keep the original date if the account was already verified.
    if (!user.emailVerifiedAt) {
      await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
    }
  });

  // Log the user straight in — they just proved they own the mailbox.
  return signToken({ sub: user.id, email: user.email, role: user.role });
}

export async function resendVerification(body: ResendVerificationBody) {
  const genericResponse = {
    message: 'If that account exists and is unverified, a new link is on its way',
  };

  const [user] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
  // Same answer whether or not the address exists, so this can't be used to
  // enumerate registered users.
  if (!user || user.emailVerifiedAt) return genericResponse;

  const [recent] = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userId, user.id),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.createdAt, new Date(Date.now() - RESEND_COOLDOWN_MS)),
      ),
    );
  if (recent) return genericResponse;

  // Burn any link still alive so only the newest one works.
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(
      and(eq(emailVerificationTokens.userId, user.id), isNull(emailVerificationTokens.usedAt)),
    );

  await issueVerificationToken(user.id, user.email);
  return genericResponse;
}
