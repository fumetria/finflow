import { api } from '@/lib/api';

export type Frequency = 'monthly' | 'quarterly' | 'biannual' | 'yearly' | 'weekly';

export type RecurringRule = {
  id: string;
  userId: string;
  accountId: string;
  entityId: string | null;
  categoryId: string | null;
  concept: string;
  amount: string | null;
  frequency: Frequency;
  dayOfMonth: number | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
};

// Fields the create endpoint accepts. `accountId` is required on create but the
// backend's update schema does NOT accept it (the account can't be changed).
export type RecurringRuleCreateInput = {
  accountId: string;
  concept: string;
  amount: number;
  frequency: Frequency;
  dayOfMonth?: number;
  startDate: string; // ISO datetime
  endDate?: string | null; // ISO datetime
  categoryId?: string | null;
  notes?: string | null;
};

export type RecurringRuleUpdateInput = Omit<RecurringRuleCreateInput, 'accountId'> & {
  active?: boolean;
};

export type GenerateResult = { generated: number; skipped: number };

// GET /recurring-rules
export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  const { data } = await api.get<{ userRecurringRules: RecurringRule[] }>('/recurring-rules');
  return data.userRecurringRules;
}

// POST /recurring-rules
export async function createRecurringRule(input: RecurringRuleCreateInput): Promise<void> {
  await api.post('/recurring-rules', input);
}

// PATCH /recurring-rules/:id (partial; accountId is not accepted by the backend)
export async function updateRecurringRule(
  id: string,
  input: Partial<RecurringRuleUpdateInput>,
): Promise<void> {
  await api.patch(`/recurring-rules/${id}`, input);
}

// DELETE /recurring-rules/:id
export async function deleteRecurringRule(id: string): Promise<void> {
  await api.delete(`/recurring-rules/${id}`);
}

// POST /recurring-rules/generate — materialize upcoming expenses (idempotent).
export async function generateRecurringExpenses(): Promise<GenerateResult> {
  const { data } = await api.post<GenerateResult>('/recurring-rules/generate', {});
  return data;
}
