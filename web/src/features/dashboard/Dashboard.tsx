import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Icon } from '@/components/icon/Icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/lib/currency';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import {
  fetchForecast,
  type AccountForecast,
  type CategoryBreakdownItem,
  type ForecastResponse,
  type ForecastTotals,
} from './forecast';
import {
  fetchExpenses,
  markExpensePaid,
  type Expense,
} from '@/features/expenses/expenses.api';
import {
  accountTypeIcon,
  fetchAccounts,
  type Account,
  type AccountType,
} from '@/features/accounts/accounts.api';

// Cuántos pagos pendientes más próximos mostrar en el dashboard.
const UPCOMING_LIMIT = 5;

function toInputValue(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// `days` from today, as a YYYY-MM-DD string.
function inDays(days: number): string {
  const now = new Date();
  return toInputValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

// Last day of the month `offset` months from now, as a YYYY-MM-DD string.
function endOfMonth(offset: number): string {
  const now = new Date();
  return toInputValue(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0));
}

const PRESETS = [
  { labelKey: 'Dashboard_preset_7d', value: () => inDays(7) },
  { labelKey: 'Dashboard_preset_eom', value: () => endOfMonth(0) },
  { labelKey: 'Dashboard_preset_1m', value: () => endOfMonth(1) },
  { labelKey: 'Dashboard_preset_3m', value: () => endOfMonth(3) },
] as const;

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  const [date, setDate] = useState(() => endOfMonth(0));
  const [reloadKey, setReloadKey] = useState(0);
  const [paying, setPaying] = useState<string | null>(null);
  const [result, setResult] = useState<{
    key: string;
    data: ForecastResponse | null;
    expenses: Expense[];
    accounts: Account[];
    error: boolean;
  }>({ key: '', data: null, expenses: [], accounts: [], error: false });

  // Identifies the request the effect should serve; changes on a new date or a
  // retry. `loading` is derived from it so we never setState in the effect body.
  const requestKey = `${date}:${reloadKey}`;

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchForecast(date), fetchExpenses(), fetchAccounts()])
      .then(([forecast, expenses, accounts]) => {
        if (!cancelled)
          setResult({ key: requestKey, data: forecast, expenses, accounts, error: false });
      })
      .catch(() => {
        if (!cancelled)
          setResult({ key: requestKey, data: null, expenses: [], accounts: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, date]);

  const loading = result.key !== requestKey;
  const error = !loading && result.error;
  const data = loading ? null : result.data;

  // Los N pagos pendientes con vencimiento más cercano (globales, no dependen de
  // la fecha de proyección). Mismo criterio que la página de gastos.
  const upcoming = useMemo(
    () =>
      result.expenses
        .filter((e) => e.status === 'pending')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, UPCOMING_LIMIT),
    [result.expenses],
  );

  // Nombre y moneda por cuenta, tomados del forecast (ya trae accountId/name/currency).
  const accountsById = useMemo(
    () => new Map((data?.accounts ?? []).map((a) => [a.accountId, a])),
    [data],
  );

  // Tipo de cuenta por id: el forecast no lo trae, lo unimos con /accounts para el icono.
  const accountTypeById = useMemo(
    () => new Map(result.accounts.map((a) => [a.id, a.type])),
    [result.accounts],
  );

  async function handlePay(id: string) {
    setPaying(id);
    try {
      // Pagar altera balances y proyección: refrescamos forecast y gastos juntos.
      await markExpensePaid(id);
      setReloadKey((k) => k + 1);
    } catch {
      setReloadKey((k) => k + 1);
    } finally {
      setPaying(null);
    }
  }

  const todayLabel = useMemo(() => {
    const s = new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    // Intl en español devuelve el día en minúscula ("lunes"); el diseño lo
    // muestra capitalizado.
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [i18n.language]);

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${date}T00:00:00`)),
    [date, i18n.language],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-7">
      <section className='flex justify-between items-center'>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {t('Dashboard_title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('Dashboard_header_date', { date: todayLabel })}
          </p>
        </div>
        <div className='flex '>
          <Button className='cursor-pointer' >
            <Link to="/expenses">{t('Button_Show_Expenses')}</Link>
          </Button>
        </div>
      </section>

      {/* Date controls */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t('Dashboard_date_label')}
        </span>
        {PRESETS.map((preset) => {
          const value = preset.value();
          const active = value === date;
          return (
            <Button
              key={preset.labelKey}
              size="sm"
              variant={active ? 'secondary' : 'outline'}
              onClick={() => setDate(value)}
            >
              {t(preset.labelKey)}
            </Button>
          );
        })}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 rounded-md border border-border bg-transparent px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <ForecastSkeleton />
        ) : error ? (
          <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
        ) : !data || data.accounts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {t('Dashboard_projected_to', { date: formattedDate })}
            </p>
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <CompositionCard totals={data.totals} formatCurrency={formatCurrency} />
              <CategoryPieCard
                breakdown={data.categoryBreakdown}
                formatCurrency={formatCurrency}
                currency={data.totals.currency}
              />
            </div>
            {/* Móvil: carrusel horizontal con título de sección */}
            <div className="sm:hidden">
              <h2 className="mb-2 font-heading text-sm font-medium">
                {t('Dashboard_accounts_title')}
              </h2>
              <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
                {data.accounts.map((account) => (
                  <div key={account.accountId} className="shrink-0 basis-[85%] snap-center">
                    <AccountCard
                      account={account}
                      type={accountTypeById.get(account.accountId)}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Escritorio: grid (sin cambios) */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {data.accounts.map((account) => (
                <AccountCard
                  key={account.accountId}
                  account={account}
                  type={accountTypeById.get(account.accountId)}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>

            {/* Próximos pagos: pendientes más cercanos, pagables sin salir del dashboard */}
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle>{t('Dashboard_upcoming_title')}</CardTitle>
                <Button asChild size="xs" variant="outline">
                  <Link to="/expenses">{t('Dashboard_upcoming_view_all')}</Link>
                </Button>
              </CardHeader>
              <CardContent className="px-0">
                {upcoming.length === 0 ? (
                  <div className="flex items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
                    <Icon name="check" size={16} />
                    {t('Dashboard_upcoming_empty')}
                  </div>
                ) : (
                  <div className="divide-y border-t">
                    {upcoming.map((expense) => (
                      <UpcomingRow
                        key={expense.id}
                        expense={expense}
                        account={accountsById.get(expense.accountId)}
                        paying={paying === expense.id}
                        onPay={() => handlePay(expense.id)}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function AccountCard({
  account,
  type,
  formatCurrency,
}: {
  account: AccountForecast;
  type: AccountType | undefined;
  formatCurrency: (amount: string, currency: string) => string;
}) {
  const { t } = useTranslation();
  const projected = Number(account.projectedBalance);
  const short = Number(account.shortfall);
  const negative = projected < 0;

  // Cobertura: qué parte de lo pendiente cubre el saldo actual (0..1). Sin pendientes → 100%.
  const pending = Number(account.pendingUntilDate);
  const current = Number(account.currentBalance);
  const coverage = pending <= 0 ? 1 : Math.min(Math.max(current / pending, 0), 1);
  const covered = short <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type && (
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-md',
                type === 'bank' ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon name={accountTypeIcon(type)} size={15} />
            </span>
          )}
          <span className="truncate">{account.name}</span>
          <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {account.currency}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('Dashboard_projected')}
          </p>
          <p
            className={cn(
              'font-heading text-2xl font-semibold tabular-nums',
              negative ? 'text-expense' : 'text-income',
            )}
          >
            {formatCurrency(account.projectedBalance, account.currency)}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('Dashboard_current')}</span>
          <span className="tabular-nums">
            {formatCurrency(account.currentBalance, account.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('Dashboard_pending')}</span>
          <span className="tabular-nums text-expense">
            −{formatCurrency(account.pendingUntilDate, account.currency)}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t('Dashboard_coverage')}</span>
            <span className="tabular-nums">{Math.round(coverage * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', covered ? 'bg-income' : 'bg-expense')}
              style={{ width: `${coverage * 100}%` }}
            />
          </div>
        </div>

        {short > 0 ? (
          <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground">
            <Icon name="important" size={14} className="text-expense" />
            {t('Dashboard_shortfall', {
              amount: formatCurrency(account.shortfall, account.currency),
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground">
            <Icon name="check" size={14} className="text-income" />
            {t('Dashboard_covered')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Una fila de "Próximos pagos": concepto, cuenta·vencimiento, importe y acción de
// marcar pagado. Layout tomado de `ExpenseCard` en la página de gastos.
function UpcomingRow({
  expense,
  account,
  paying,
  onPay,
  formatCurrency,
}: {
  expense: Expense;
  account: AccountForecast | undefined;
  paying: boolean;
  onPay: () => void;
  formatCurrency: (amount: string, currency: string) => string;
}) {
  const { t, i18n } = useTranslation();
  const currency = account?.currency ?? 'EUR';

  const due = new Date(expense.dueDate);
  const dueLabel = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(due);

  // Días hasta el vencimiento respecto a hoy (a medianoche local). Solo resaltamos los
  // vencimientos cercanos o vencidos; el resto muestra la fecha absoluta neutra.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((dueMidnight.getTime() - startOfToday.getTime()) / 86_400_000);

  let urgency: { label: string; className: string } = {
    label: dueLabel,
    className: 'text-muted-foreground',
  };
  if (days < 0) {
    urgency = { label: t('Dashboard_due_overdue'), className: 'text-expense font-medium' };
  } else if (days === 0) {
    urgency = { label: t('Dashboard_due_today'), className: 'text-warning font-medium' };
  } else if (days === 1) {
    urgency = { label: t('Dashboard_due_tomorrow'), className: 'text-warning font-medium' };
  } else if (days <= 3) {
    urgency = { label: t('Dashboard_due_in_days', { count: days }), className: 'text-warning' };
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{expense.concept}</p>
        <p className="flex min-w-0 items-center gap-1 truncate text-xs">
          <span className="truncate text-muted-foreground">
            {account?.name ?? <span className="italic">{t('Expenses_account_unknown')}</span>}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className={cn('shrink-0', urgency.className)}>{urgency.label}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="tabular-nums font-medium text-expense">
          −{formatCurrency(expense.amount, currency)}
        </span>
        <Button size="sm" variant="outline" disabled={paying} onClick={onPay}>
          {t('Expenses_mark_paid')}
        </Button>
      </div>
    </div>
  );
}

// Aggregated breakdown of the whole projection (mirrors the design handoff's
// "Composición" card). Updates with the selected projection date via `totals`.
function CompositionCard({
  totals,
  formatCurrency,
}: {
  totals: ForecastTotals;
  formatCurrency: (amount: string, currency: string) => string;
}) {
  const { t } = useTranslation();
  const negative = Number(totals.projectedBalance) < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Dashboard_composition_title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <BreakRow
          label={t('Dashboard_available_balance')}
          value={formatCurrency(totals.currentBalance, totals.currency)}
        />
        <BreakRow
          label={t('Dashboard_pending_total')}
          value={`−${formatCurrency(totals.pendingUntilDate, totals.currency)}`}
          accent="expense"
        />
        <div className="my-1 border-t border-border" />
        <BreakRow
          label={t('Dashboard_result')}
          value={formatCurrency(totals.projectedBalance, totals.currency)}
          accent={negative ? 'expense' : 'income'}
          strong
        />
      </CardContent>
    </Card>
  );
}

function BreakRow({
  label,
  value,
  accent,
  strong,
}: {
  label: string;
  value: string;
  accent?: 'income' | 'expense';
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn('text-muted-foreground', strong && 'font-medium text-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums',
          strong ? 'text-[15px] font-semibold' : 'font-medium',
          accent === 'income' && 'text-income',
          accent === 'expense' && 'text-expense',
        )}
      >
        {value}
      </span>
    </div>
  );
}

// Fixed palette assigned to category slices by index (categories have no color
// of their own). The last color is reserved for the "uncategorized" bucket.
const CATEGORY_PALETTE = [
  '#0ea5e9',
  '#f59e0b',
  '#8b5cf6',
  '#14b8a6',
  '#ec4899',
  '#ef4444',
  '#22c55e',
  '#6366f1',
] as const;
const UNCATEGORIZED_COLOR = '#94a3b8';

// Pending-expenses composition by category, within the selected projection
// window. Reacts to the date selector via the forecast's `categoryBreakdown`.
function CategoryPieCard({
  breakdown,
  formatCurrency,
  currency,
}: {
  breakdown: CategoryBreakdownItem[];
  formatCurrency: (amount: string, currency: string) => string;
  currency: string;
}) {
  const { t } = useTranslation();

  const slices = useMemo(
    () =>
      breakdown.map((item, i) => ({
        key: item.categoryId ?? '__uncategorized__',
        name: item.name ?? t('Dashboard_category_uncategorized'),
        value: Number(item.total),
        color: item.categoryId ? CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]! : UNCATEGORIZED_COLOR,
      })),
    [breakdown, t],
  );

  const total = slices.reduce((s, c) => s + c.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Dashboard_category_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            {t('Dashboard_category_empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {slices.map((c) => (
                      <Cell key={c.key} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1">
              <ul className="flex flex-col gap-2">
                {slices.map((c) => (
                  <li key={c.key} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: c.color }}
                    />
                    <span className="flex-1 truncate text-foreground/80">{c.name}</span>
                    <span className="tabular-nums text-[13px] text-muted-foreground">
                      {Math.round((c.value / total) * 100)}%
                    </span>
                    <span className="w-20 text-right tabular-nums text-[13px] font-medium">
                      {formatCurrency(c.value.toFixed(2), currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ForecastSkeleton() {
  return (
    <>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-7 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2.5">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-6 w-full animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <Card className="items-center py-12 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="wallet" size={22} />
        </span>
        <p className="text-sm font-medium text-foreground">{t('Dashboard_empty_title')}</p>
        <Button asChild size="sm">
          <Link to="/accounts">{t('Dashboard_empty_cta')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="items-center py-12 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">{t('Dashboard_error')}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('Dashboard_retry')}
        </Button>
      </CardContent>
    </Card>
  );
}
