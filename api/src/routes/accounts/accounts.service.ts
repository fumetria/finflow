import { accounts, db } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../../middlewares/errorHandler.js';
import type { createAccount, updateAccount } from './accounts.schemas.js';

export async function findAllAccounts(userId: string) {
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  return userAccounts;
}

export async function findAccountById(userId: string, id: string) {
  const [userAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
  if (!userAccount) {
    throw new AppError('NOT_FOUND', 'Not found any account with this id', 404);
  }
  return userAccount;
}

export async function createAccount(userId: string, data: createAccount) {
  const existsAccount = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.name, data.name)));
  if (existsAccount.length > 0) {
    throw new AppError('ACC_EXISTS', 'This account is already created', 404);
  }
  const newAccount = await db
    .insert(accounts)
    .values({
      userId: userId,
      name: data.name,
      type: data.type,
      currentBalance: data.currentBalance,
      currency: data.currency,
    })
    .returning();
  return newAccount;
}

export async function updateAccount(userId: string, id: string, data: updateAccount) {
  const accountUpdate = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
  if (accountUpdate.length === 0) {
    throw new AppError('ACC_NOT_EXISTS', 'Account not found', 404);
  }
  const UpdateAccount = await db
    .update(accounts)
    .set({
      name: data.name,
      type: data.type,
      currentBalance: data.currentBalance,
      currency: data.currency,
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  return UpdateAccount;
}
