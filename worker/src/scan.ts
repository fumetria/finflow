import { and, eq, isNull, lte } from 'drizzle-orm';
import { db, schema } from './db.js';
import { env } from './config/env.js';
import { connectProducer, publishDueSoon } from './producer.js';

const { expenses, users, accounts } = schema;

/**
 * Finds pending expenses due within DUE_SOON_DAYS (including overdue) that
 * haven't been notified yet, and publishes a due-soon event for each.
 * Returns the number of events published.
 */
export async function scanDueSoon(): Promise<number> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + env.DUE_SOON_DAYS);

  const rows = await db
    .select({
      expenseId: expenses.id,
      userId: expenses.userId,
      userEmail: users.email,
      concept: expenses.concept,
      amount: expenses.amount,
      currency: accounts.currency,
      dueDate: expenses.dueDate,
      accountName: accounts.name,
    })
    .from(expenses)
    .innerJoin(users, eq(users.id, expenses.userId))
    .innerJoin(accounts, eq(accounts.id, expenses.accountId))
    .where(
      and(
        eq(expenses.status, 'pending'),
        isNull(expenses.dueSoonNotifiedAt),
        lte(expenses.dueDate, threshold),
      ),
    );

  if (rows.length === 0) {
    console.log('[scan] no due-soon expenses');
    return 0;
  }

  await connectProducer();
  for (const r of rows) {
    await publishDueSoon({
      expenseId: r.expenseId,
      userId: r.userId,
      userEmail: r.userEmail,
      concept: r.concept,
      amount: r.amount,
      currency: r.currency,
      dueDate: r.dueDate.toISOString(),
      accountName: r.accountName,
    });
  }

  console.log(`[scan] published ${rows.length} due-soon event(s)`);
  return rows.length;
}
