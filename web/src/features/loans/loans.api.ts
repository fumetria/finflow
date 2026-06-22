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

// POST /loans/materialize — turn upcoming installments into pending expenses.
export async function materializeLoans(): Promise<{ materialized: number }> {
  const { data } = await api.post<{ materialized: number }>('/loans/materialize', {});
  return data;
}
