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

  const totals = accountsForecast.reduce(
    (acc, a) => {
      acc.currentBalance += Number(a.currentBalance);
      acc.pendingUntilDate += Number(a.pendingUntilDate);
      acc.projectedBalance += Number(a.projectedBalance);
      return acc;
    },
    { currentBalance: 0, pendingUntilDate: 0, projectedBalance: 0 },
  );

  return {
    date: targetDate.toISOString().slice(0, 10),
    accounts: accountsForecast,
    totals: {
      // Single-currency assumption (coherente con el resto de la app). La moneda
      // representativa es la de la primera cuenta; mezclar divisas queda fuera de alcance.
      currency: userAccounts[0]?.currency ?? 'EUR',
      currentBalance: totals.currentBalance.toFixed(2),
      pendingUntilDate: totals.pendingUntilDate.toFixed(2),
      projectedBalance: totals.projectedBalance.toFixed(2),
    },
  };
}
