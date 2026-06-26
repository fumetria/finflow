import { expenses, db, accounts, loanInstallments, loans } from '../../db/index.js';
import { eq, and, ne } from 'drizzle-orm';
import { AppError } from '../../middlewares/errorHandler.js';
import type { CreateExpense, UpdateExpense, MarkAsPaid } from './expenses.schemas.js';

export async function findAllExpenses(userId: string) {
  const userExpenses = await db.select().from(expenses).where(eq(expenses.userId, userId));
  return userExpenses;
}

export async function findExpensesById(userId: string, id: string) {
  const [userExpesesById] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.id, id)));
  if (!userExpesesById) {
    throw new AppError('EXPENSES_NOT_FOUND', 'Not found any expenses with this id', 404);
  }
  return userExpesesById;
}

export async function createExpense(userId: string, data: CreateExpense) {
  const formatedAmount = data.amount.toString();
  const newExpense = await db
    .insert(expenses)
    .values({
      userId: userId,
      accountId: data.accountId,
      entityId: data.entityId,
      categoryId: data.categoryId,
      concept: data.concept,
      amount: formatedAmount,
      dueDate: new Date(data.dueDate),
      notes: data.notes,
    })
    .returning();
  return newExpense;
}

export async function updateExpense(userId: string, id: string, data: UpdateExpense) {
  await findExpensesById(userId, id);
  const setData = {
    ...(data.concept !== undefined && { concept: data.concept }),
    ...(data.accountId !== undefined && { accountId: data.accountId }),
    ...(data.entityId !== undefined && { entityId: data.entityId }),
    ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    ...(data.amount !== undefined && { amount: data.amount.toString() }),
    ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
    ...(data.notes !== undefined && { notes: data.notes }),
  };
  const updatedExpense = await db
    .update(expenses)
    .set(setData)
    .where(and(eq(expenses.userId, userId), eq(expenses.id, id)))
    .returning();
  return updatedExpense;
}

export async function markAsPaid(userId: string, id: string, data: MarkAsPaid) {
  await db.transaction(async (tx) => {
    const selectedExpense = await findExpensesById(userId, id);
    const [selectedAccount] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, selectedExpense.accountId)));
    if (selectedExpense.status === 'paid') {
      throw new AppError('ALREADY_PAID', 'Expenses already payed', 400);
    }
    await tx
      .update(expenses)
      .set({ status: 'paid', paidAt: data.paidAt ? new Date(data.paidAt) : new Date() })
      .where(and(eq(expenses.userId, userId), eq(expenses.id, id)));

    // Keep the loan installment in sync when this expense materializes one.
    // No-op (empty result) for regular expenses not linked to an installment.
    const [paidInstallment] = await tx
      .update(loanInstallments)
      .set({ status: 'paid' })
      .where(and(eq(loanInstallments.userId, userId), eq(loanInstallments.expenseId, id)))
      .returning({ loanId: loanInstallments.loanId });

    // Close the loan automatically once it has no pending installments left.
    if (paidInstallment) {
      const [stillPending] = await tx
        .select({ id: loanInstallments.id })
        .from(loanInstallments)
        .where(
          and(
            eq(loanInstallments.userId, userId),
            eq(loanInstallments.loanId, paidInstallment.loanId),
            ne(loanInstallments.status, 'paid'),
          ),
        )
        .limit(1);

      if (!stillPending) {
        await tx
          .update(loans)
          .set({ status: 'paid' })
          .where(and(eq(loans.userId, userId), eq(loans.id, paidInstallment.loanId)));
      }
    }

    const newBalance = Number(selectedAccount?.currentBalance) - Number(selectedExpense?.amount);
    await tx
      .update(accounts)
      .set({ currentBalance: newBalance.toString() })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, selectedExpense.accountId)));
  });
}
