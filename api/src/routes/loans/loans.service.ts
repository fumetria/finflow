import { db, loans, loanInstallments, expenses, accounts } from '../../db/index.js';
import { buildAmortizationSchedule, addMonthsUTC } from './loans.amortization.js';
import type { CreateLoan, ReviseLoan } from './loans.schema.js';
import { eq, and, asc, lte, isNull, inArray, isNotNull } from 'drizzle-orm';
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

// Change the account a loan is charged to.
//
// Updates the loan's accountId and re-points every already-materialized expense
// that is still pending to the new account, so the forecast charges the right
// account going forward. Paid expenses are left untouched (their balance was
// already deducted from the old account — that's real history). Future
// materializations need no special handling: they read loan.accountId.
//
// A pending expense hasn't deducted any balance yet (deduction happens on
// mark-as-paid), so no balance recalculation is required. Runs in one
// transaction. Validates the new account belongs to the user.
export async function updateLoanAccount(userId: string, id: string, accountId: string) {
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));
  if (!account) {
    throw new AppError('ACCOUNT_NOT_FOUND', 'Not found any account with this id', 404);
  }

  return db.transaction(async (tx) => {
    const [loan] = await tx
      .update(loans)
      .set({ accountId })
      .where(and(eq(loans.userId, userId), eq(loans.id, id)))
      .returning();
    if (!loan) {
      throw new AppError('LOAN_NOT_FOUND', 'Not found any loan with this id', 404);
    }

    // Expense ids linked to this loan's installments (materialized cuotas).
    const linked = await tx
      .select({ expenseId: loanInstallments.expenseId })
      .from(loanInstallments)
      .where(
        and(
          eq(loanInstallments.userId, userId),
          eq(loanInstallments.loanId, id),
          isNotNull(loanInstallments.expenseId),
        ),
      );
    const expenseIds = linked
      .map((row) => row.expenseId)
      .filter((expenseId): expenseId is string => expenseId !== null);

    if (expenseIds.length > 0) {
      await tx
        .update(expenses)
        .set({ accountId })
        .where(
          and(
            eq(expenses.userId, userId),
            inArray(expenses.id, expenseIds),
            eq(expenses.status, 'pending'),
          ),
        );
    }

    return loan;
  });
}

// Revise a loan: recalculate the pending tail of the amortization schedule while
// keeping already-paid installments (and their expenses) untouched — they are
// real history that already moved the account balance.
//
// The pending installments are rebuilt from `outstandingCapital` at the new
// `annualRate` over `remainingTerm` months, anchored to the original calendar so
// due dates stay aligned. Lowering the capital models an early contribution;
// lowering the term shortens the loan (vs. lowering the installment). Any pending
// installment already materialized into a (still pending) expense is discarded
// and its expense deleted — no balance was touched, so no recalculation needed.
// Runs in one transaction.
export async function reviseLoan(userId: string, id: string, data: ReviseLoan) {
  const [loan] = await db
    .select()
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.id, id)));
  if (!loan) {
    throw new AppError('LOAN_NOT_FOUND', 'Not found any loan with this id', 404);
  }

  const installments = await db
    .select()
    .from(loanInstallments)
    .where(and(eq(loanInstallments.userId, userId), eq(loanInstallments.loanId, id)))
    .orderBy(asc(loanInstallments.number));

  const paidCount = installments.filter((it) => it.status === 'paid').length;
  const metadata = {
    concept: data.concept,
    entityId: data.entityId ?? null,
    notes: data.notes ?? null,
  };

  // Fully-paid loan (no pending tail): only metadata can change.
  if (paidCount === installments.length) {
    const [updated] = await db
      .update(loans)
      .set(metadata)
      .where(and(eq(loans.userId, userId), eq(loans.id, id)))
      .returning();
    const rows = await db
      .select()
      .from(loanInstallments)
      .where(and(eq(loanInstallments.userId, userId), eq(loanInstallments.loanId, id)))
      .orderBy(asc(loanInstallments.number));
    return { loan: updated, installments: rows };
  }

  const anchor = addMonthsUTC(new Date(loan.startDate), paidCount);
  const schedule = buildAmortizationSchedule({
    principal: data.outstandingCapital,
    annualRate: data.annualRate,
    termMonths: data.remainingTerm,
    startDate: anchor,
  });

  return db.transaction(async (tx) => {
    // Discard the still-pending materialized expenses of this loan.
    const pendingInstallments = installments.filter((it) => it.status === 'pending');
    const pendingExpenseIds = pendingInstallments
      .map((it) => it.expenseId)
      .filter((expenseId): expenseId is string => expenseId !== null);
    if (pendingExpenseIds.length > 0) {
      await tx
        .delete(expenses)
        .where(and(eq(expenses.userId, userId), inArray(expenses.id, pendingExpenseIds)));
    }

    // Drop the old pending installments and rebuild the tail.
    await tx
      .delete(loanInstallments)
      .where(
        and(
          eq(loanInstallments.userId, userId),
          eq(loanInstallments.loanId, id),
          eq(loanInstallments.status, 'pending'),
        ),
      );

    await tx.insert(loanInstallments).values(
      schedule.map((entry) => ({
        userId,
        loanId: id,
        number: paidCount + entry.number,
        dueDate: entry.dueDate,
        amount: entry.amount.toString(),
        principalComponent: entry.principalComponent.toString(),
        interestComponent: entry.interestComponent.toString(),
        remainingBalance: entry.remainingBalance.toString(),
      })),
    );

    const [updated] = await tx
      .update(loans)
      .set({
        ...metadata,
        annualRate: data.annualRate.toString(),
        termMonths: paidCount + data.remainingTerm,
        // With no paid history the principal simply becomes the new amount;
        // otherwise the original borrowed principal is preserved as history.
        ...(paidCount === 0 ? { principal: data.outstandingCapital.toString() } : {}),
      })
      .where(and(eq(loans.userId, userId), eq(loans.id, id)))
      .returning();

    const rows = await tx
      .select()
      .from(loanInstallments)
      .where(and(eq(loanInstallments.userId, userId), eq(loanInstallments.loanId, id)))
      .orderBy(asc(loanInstallments.number));

    return { loan: updated, installments: rows };
  });
}

// Delete a loan and its installments (cascade). Still-pending materialized
// expenses are removed (no balance impact); already-paid expenses are kept as
// history and the account balance is left untouched.
export async function deleteLoan(userId: string, id: string) {
  const [loan] = await db
    .select({ id: loans.id })
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.id, id)));
  if (!loan) {
    throw new AppError('LOAN_NOT_FOUND', 'Not found any loan with this id', 404);
  }

  await db.transaction(async (tx) => {
    const linked = await tx
      .select({ expenseId: loanInstallments.expenseId })
      .from(loanInstallments)
      .where(
        and(
          eq(loanInstallments.userId, userId),
          eq(loanInstallments.loanId, id),
          isNotNull(loanInstallments.expenseId),
        ),
      );
    const expenseIds = linked
      .map((row) => row.expenseId)
      .filter((expenseId): expenseId is string => expenseId !== null);

    if (expenseIds.length > 0) {
      await tx
        .delete(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            inArray(expenses.id, expenseIds),
            eq(expenses.status, 'pending'),
          ),
        );
    }

    // Cascade on loan_installments.loanId removes the installments.
    await tx.delete(loans).where(and(eq(loans.userId, userId), eq(loans.id, id)));
  });

  return { ok: true };
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
