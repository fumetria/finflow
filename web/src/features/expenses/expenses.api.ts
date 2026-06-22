import { api } from '@/lib/api';

export type ExpenseStatus = 'pending' | 'paid';

export type Expense = {
  id: string;
  userId: string;
  accountId: string;
  entityId: string | null;
  concept: string;
  amount: string;
  dueDate: string;
  status: ExpenseStatus;
  paidAt: string | null;
  notes: string | null;
  recurringRuleId: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type ExpenseInput = {
  accountId: string;
  concept: string;
  amount: number;
  dueDate: string; // ISO datetime
  notes?: string | null;
};

// GET /expenses — all expenses for the authenticated user.
export async function fetchExpenses(): Promise<Expense[]> {
  const { data } = await api.get<{ userExpenses: Expense[] }>('/expenses');
  return data.userExpenses;
}

// POST /expenses — create a new expense (status defaults to 'pending').
export async function createExpense(input: ExpenseInput): Promise<void> {
  await api.post('/expenses', input);
}

// PATCH /expenses/:id — update an existing expense.
export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  await api.patch(`/expenses/${id}`, input);
}

// PATCH /expenses/:id/paid — mark as paid; the backend deducts the amount from
// the linked account's balance. Defaults paidAt to now.
export async function markExpensePaid(id: string): Promise<void> {
  await api.patch(`/expenses/${id}/paid`, {});
}
