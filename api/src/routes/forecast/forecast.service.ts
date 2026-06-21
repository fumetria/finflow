import { and, eq, lte, sql } from 'drizzle-orm';
import { accounts, expenses, db } from '../../db/index.js';

// Forecast = current_balance − pending_expenses_until_date, per account.
// Incomes are postponed (Phase 2 decision), so no expected_incomes term yet.
export async function getForecast(userId: string, dateStr?: string) {
  const now = new Date();
  const targetDate = dateStr
    ? new Date(`${dateStr}T23:59:59.999Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const pendingRows = await db
    .select({
      accountId: expenses.accountId,
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.status, 'pending'),
        lte(expenses.dueDate, targetDate),
      ),
    )
    .groupBy(expenses.accountId);

  const pendingByAccount = new Map(pendingRows.map((r) => [r.accountId, Number(r.total)]));

  const accountsForecast = userAccounts.map((account) => {
    const pending = pendingByAccount.get(account.id) ?? 0;
    const current = Number(account.currentBalance);
    const projected = current - pending;
    return {
      accountId: account.id,
      name: account.name,
      currency: account.currency,
      currentBalance: current.toFixed(2),
      pendingUntilDate: pending.toFixed(2),
      projectedBalance: projected.toFixed(2),
      shortfall: projected < 0 ? (-projected).toFixed(2) : '0.00',
    };
  });

  return {
    date: targetDate.toISOString().slice(0, 10),
    accounts: accountsForecast,
  };
}
