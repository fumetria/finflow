import { api } from '@/lib/api';

export type AccountForecast = {
  accountId: string;
  name: string;
  currency: string;
  currentBalance: string;
  pendingUntilDate: string;
  projectedBalance: string;
  shortfall: string;
};

export type ForecastTotals = {
  currency: string;
  currentBalance: string;
  pendingUntilDate: string;
  projectedBalance: string;
};

// Pending-expenses composition by category, within the same projection window.
// `categoryId`/`name` are null for the "uncategorized" bucket.
export type CategoryBreakdownItem = {
  categoryId: string | null;
  name: string | null;
  total: string;
};

export type ForecastResponse = {
  date: string;
  accounts: AccountForecast[];
  categoryBreakdown: CategoryBreakdownItem[];
  totals: ForecastTotals;
};

// GET /forecast?date=YYYY-MM-DD — per-account projected balance vs. pending expenses.
export async function fetchForecast(date: string): Promise<ForecastResponse> {
  const { data } = await api.get<ForecastResponse>('/forecast', { params: { date } });
  return data;
}
