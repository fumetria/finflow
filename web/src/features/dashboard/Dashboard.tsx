import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon, Alert02Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchForecast, type AccountForecast, type ForecastResponse } from './forecast';

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

function useCurrencyFormatter() {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const cache = new Map<string, Intl.NumberFormat>();
    return (amount: string, currency: string) => {
      let fmt = cache.get(currency);
      if (!fmt) {
        fmt = new Intl.NumberFormat(i18n.language, { style: 'currency', currency });
        cache.set(currency, fmt);
      }
      return fmt.format(Number(amount));
    };
  }, [i18n.language]);
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  const [date, setDate] = useState(() => endOfMonth(0));
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchForecast(date)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, reloadKey]);

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
    <div className="mx-auto max-w-5xl px-7 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {t('Dashboard_title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('Dashboard_subtitle')}</p>
      </div>

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.accounts.map((account) => (
                <AccountCard
                  key={account.accountId}
                  account={account}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AccountCard({
  account,
  formatCurrency,
}: {
  account: AccountForecast;
  formatCurrency: (amount: string, currency: string) => string;
}) {
  const { t } = useTranslation();
  const projected = Number(account.projectedBalance);
  const short = Number(account.shortfall);
  const negative = projected < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{account.name}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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

        {short > 0 ? (
          <div className="flex items-center gap-1.5 rounded-md bg-expense/10 px-2.5 py-1.5 text-xs font-medium text-expense">
            <HugeiconsIcon icon={Alert02Icon} size={14} />
            {t('Dashboard_shortfall', {
              amount: formatCurrency(account.shortfall, account.currency),
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-md bg-income/10 px-2.5 py-1.5 text-xs font-medium text-income">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
            {t('Dashboard_covered')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ForecastSkeleton() {
  return (
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
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <Card className="items-center py-12 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={Wallet01Icon} size={22} />
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
