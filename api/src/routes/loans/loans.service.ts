import { db, loans, loanInstallments } from '../../db/index.js';
import { buildAmortizationSchedule } from './loans.amortization.js';
import type { CreateLoan } from './loans.schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { AppError } from '../../middlewares/errorHandler.js';

export async function findAllLoans(userId: string) {
  const userLoans = await db.select().from(loans).where(eq(loans.userId, userId));
  return userLoans;
}

export async function findLoanById(userId: string, id: string) {
  const [selectedLoan] = await db
    .select()
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.id, id)));
  if (!selectedLoan) {
    throw new AppError('LOAN_NOT_FOUND', 'Not found any loan with this id', 404);
  }

  const installments = await db
    .select()
    .from(loanInstallments)
    .where(and(eq(loanInstallments.userId, userId), eq(loanInstallments.loanId, id)))
    .orderBy(asc(loanInstallments.number));

  return { loan: selectedLoan, installments };
}

// Create a loan and persist its full amortization schedule in one transaction.
// Money fields are stored as strings (Postgres numeric); the schedule is
// computed by the pure helper so this function only handles persistence.
export async function createLoan(userId: string, data: CreateLoan) {
  const startDate = new Date(data.startDate);

  const schedule = buildAmortizationSchedule({
    principal: data.principal,
    annualRate: data.annualRate,
    termMonths: data.termMonths,
    startDate,
  });

  return db.transaction(async (tx) => {
    const [loan] = await tx
      .insert(loans)
      .values({
        userId,
        accountId: data.accountId,
        entityId: data.entityId ?? undefined,
        concept: data.concept,
        principal: data.principal.toString(),
        annualRate: data.annualRate.toString(),
        termMonths: data.termMonths,
        startDate,
        notes: data.notes ?? undefined,
      })
      .returning();

    const installments = await tx
      .insert(loanInstallments)
      .values(
        schedule.map((entry) => ({
          userId,
          loanId: loan!.id,
          number: entry.number,
          dueDate: entry.dueDate,
          amount: entry.amount.toString(),
          principalComponent: entry.principalComponent.toString(),
          interestComponent: entry.interestComponent.toString(),
          remainingBalance: entry.remainingBalance.toString(),
        })),
      )
      .returning();

    return { loan, installments };
  });
}
