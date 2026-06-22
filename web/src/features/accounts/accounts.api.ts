import { api } from '@/lib/api';

export type AccountType = 'bank' | 'cash';

export type Account = {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currentBalance: string;
  currency: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type AccountInput = {
  name: string;
  type: AccountType;
  currentBalance: string;
  currency: string;
};

// GET /accounts — all accounts for the authenticated user.
export async function fetchAccounts(): Promise<Account[]> {
  const { data } = await api.get<{ userAccounts: Account[] }>('/accounts');
  return data.userAccounts;
}

// POST /accounts — create a new account.
export async function createAccount(input: AccountInput): Promise<void> {
  await api.post('/accounts', input);
}

// PATCH /accounts/:id — update an existing account.
export async function updateAccount(id: string, input: AccountInput): Promise<void> {
  await api.patch(`/accounts/${id}`, input);
}
