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

export type ForecastResponse = {
  date: string;
  accounts: AccountForecast[];
};

// GET /forecast?date=YYYY-MM-DD — per-account projected balance vs. pending expenses.
export async function fetchForecast(date: string): Promise<ForecastResponse> {
  const { data } = await api.get<ForecastResponse>('/forecast', { params: { date } });
  return data;
}
