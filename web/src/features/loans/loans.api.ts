import { api } from '@/lib/api';

export type LoanStatus = 'active' | 'paid' | 'cancelled';
export type InstallmentStatus = 'pending' | 'paid';

export type Loan = {
  id: string;
  userId: string;
  accountId: string;
  entityId: string | null;
  concept: string;
  principal: string;
  annualRate: string;
  termMonths: number;
  startDate: string;
  status: LoanStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type LoanInstallment = {
  id: string;
  userId: string;
  loanId: string;
  number: number;
  dueDate: string;
  amount: string;
  principalComponent: string;
  interestComponent: string;
  remainingBalance: string;
  status: InstallmentStatus;
  expenseId: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type LoanDetail = { loan: Loan; installments: LoanInstallment[] };

export type LoanInput = {
  accountId: string;
  concept: string;
  principal: number;
  annualRate: number;
  termMonths: number;
  startDate: string; // ISO datetime
  notes?: string | null;
};

export type LoanReviseInput = {
  concept: string;
  entityId?: string | null;
  notes?: string | null;
  annualRate: number;
  outstandingCapital: number;
  remainingTerm: number;
};

// GET /loans
export async function fetchLoans(): Promise<Loan[]> {
  const { data } = await api.get<{ userLoans: Loan[] }>('/loans');
  return data.userLoans;
}

// GET /loans/:id — loan plus its amortization schedule (ordered by number).
export async function fetchLoan(id: string): Promise<LoanDetail> {
  const { data } = await api.get<LoanDetail>(`/loans/${id}`);
  return data;
}

// POST /loans — create a loan; the backend persists the full schedule and
// returns it. Returns the new loan id so the caller can navigate to its detail.
export async function createLoan(input: LoanInput): Promise<string> {
  const { data } = await api.post<LoanDetail>('/loans', input);
  return data.loan.id;
}

// PATCH /loans/:id — change the account the loan is charged to. Re-points
// already-materialized pending expenses to the new account server-side.
export async function updateLoanAccount(id: string, accountId: string): Promise<Loan> {
  const { data } = await api.patch<{ loan: Loan }>(`/loans/${id}`, { accountId });
  return data.loan;
}

// PUT /loans/:id — revise a loan: re-amortizes the pending installments from the
// new capital/rate/term while keeping paid installments. Returns the updated
// loan with its full (recalculated) schedule.
export async function reviseLoan(id: string, input: LoanReviseInput): Promise<LoanDetail> {
  const { data } = await api.put<LoanDetail>(`/loans/${id}`, input);
  return data;
}

// DELETE /loans/:id — delete a loan and its installments; pending materialized
// expenses are removed, paid ones are kept as history.
export async function deleteLoan(id: string): Promise<void> {
  await api.delete(`/loans/${id}`);
}

// POST /loans/materialize — turn upcoming installments into pending expenses.
export async function materializeLoans(): Promise<{ materialized: number }> {
  const { data } = await api.post<{ materialized: number }>('/loans/materialize', {});
  return data;
}
