import { db, loans, loanInstallments, expenses } from '../../db/index.js';
import { buildAmortizationSchedule } from './loans.amortization.js';
import type { CreateLoan } from './loans.schema.js';
import { eq, and, asc, lte, isNull } from 'drizzle-orm';
import { AppError } from '../../middlewares/errorHandler.js';

// Materialization horizon: how many months ahead from today an installment's
// due date may be to become an expense. Mirrors recurring_rules generate.
const MATERIALIZATION_HORIZON_MONTHS = 3;

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

// Materialize loan installments into expenses, idempotently.
//
// For every active loan, each installment whose due date is within the horizon
// (today + N months, no lower bound — overdue installments are included) and is
// not yet linked to an expense becomes a pending expense; the installment then
// stores its expenseId so a second run skips it. Runs in a transaction.
export async function materializeLoanInstallments(userId: string) {
  const now = new Date();
  const horizon = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + MATERIALIZATION_HORIZON_MONTHS,
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  const activeLoans = await db
    .select()
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.status, 'active')));

  let materialized = 0;

  await db.transaction(async (tx) => {
    for (const loan of activeLoans) {
      const pending = await tx
        .select()
        .from(loanInstallments)
        .where(
          and(
            eq(loanInstallments.userId, userId),
            eq(loanInstallments.loanId, loan.id),
            isNull(loanInstallments.expenseId),
            lte(loanInstallments.dueDate, horizon),
          ),
        )
        .orderBy(asc(loanInstallments.number));

      for (const installment of pending) {
        const [expense] = await tx
          .insert(expenses)
          .values({
            userId,
            accountId: loan.accountId,
            entityId: loan.entityId,
            concept: `${loan.concept} (cuota ${installment.number}/${loan.termMonths})`,
            amount: installment.amount,
            dueDate: installment.dueDate,
          })
          .returning();

        await tx
          .update(loanInstallments)
          .set({ expenseId: expense!.id })
          .where(eq(loanInstallments.id, installment.id));

        materialized += 1;
      }
    }
  });

  return { materialized };
}
