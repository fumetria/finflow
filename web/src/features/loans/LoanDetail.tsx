import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/lib/currency';
import { fetchAccounts, type Account } from '@/features/accounts/accounts.api';
import { fetchLoan, updateLoanAccount, type LoanDetail as LoanDetailData } from './loans.api';

// Remount the view when the loan id changes so its data-loading effect starts
// from a clean state (no synchronous setState needed inside the effect).
export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  return <LoanDetailView key={id} id={id} />;
}

function LoanDetailView({ id }: { id: string | undefined }) {
  const { t, i18n } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  const [data, setData] = useState<LoanDetailData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([fetchLoan(id), fetchAccounts()])
      .then(([detail, accs]) => {
        if (!cancelled) {
          setData(detail);
          setAccounts(accs);
          setError(false);
        }
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
  }, [id]);

  const accountId = data?.loan.accountId;
  const account = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );
  const currency = account?.currency ?? 'EUR';

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }),
    [i18n.language],
  );

  const totals = useMemo(() => {
    if (!data) return { interest: 0, total: 0 };
    return data.installments.reduce(
      (acc, it) => ({
        interest: acc.interest + Number(it.interestComponent),
        total: acc.total + Number(it.amount),
      }),
      { interest: 0, total: 0 },
    );
  }, [data]);

  return (
    <div className="mx-auto max-w-5xl px-7 py-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/loans">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          {t('Loans_back')}
        </Link>
      </Button>

      {loading ? (
        <DetailSkeleton />
      ) : error || !data ? (
        <Card className="items-center py-12 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">{t('Loans_detail_error')}</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/loans">{t('Loans_back')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              {data.loan.concept}
            </h1>
            <p className="text-sm text-muted-foreground">
              {account?.name ?? t('Loans_account_unknown')} ·{' '}
              {t(`Loans_status_${data.loan.status}`)}
              {accounts.length > 0 && !editing && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="font-medium text-brand transition-colors hover:text-brand/80"
                  >
                    {t('Loans_account_edit_link')}
                  </button>
                </>
              )}
            </p>
          </div>

          {accounts.length > 0 && editing && (
            <AccountEditor
              loanId={data.loan.id}
              accounts={accounts}
              currentAccountId={data.loan.accountId}
              onCancel={() => setEditing(false)}
              onSaved={(accountId) => {
                setData((prev) => (prev ? { ...prev, loan: { ...prev.loan, accountId } } : prev));
                setEditing(false);
              }}
            />
          )}

          {/* Summary */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat
              label={t('Loans_col_principal')}
              value={formatCurrency(data.loan.principal, currency)}
            />
            <SummaryStat label={t('Loans_rate_label')} value={`${Number(data.loan.annualRate)}%`} />
            <SummaryStat
              label={t('Loans_col_term')}
              value={t('Loans_months', { count: data.loan.termMonths })}
            />
            <SummaryStat
              label={t('Loans_total_interest')}
              value={formatCurrency(totals.interest.toFixed(2), currency)}
            />
          </div>

          {/* Amortization schedule */}
          <h2 className="mt-7 mb-3 font-heading text-sm font-semibold">{t('Loans_schedule')}</h2>
          <Card>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">#</TableHead>
                    <TableHead>{t('Loans_inst_due')}</TableHead>
                    <TableHead className="text-right">{t('Loans_inst_amount')}</TableHead>
                    <TableHead className="text-right">{t('Loans_inst_principal')}</TableHead>
                    <TableHead className="text-right">{t('Loans_inst_interest')}</TableHead>
                    <TableHead className="text-right">{t('Loans_inst_remaining')}</TableHead>
                    <TableHead className="pr-4">{t('Loans_col_status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.installments.map((it) => {
                    const paid = it.status === 'paid';
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="pl-4 tabular-nums text-muted-foreground">
                          {it.number}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dateFmt.format(new Date(it.dueDate))}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(it.amount, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(it.principalComponent, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(it.interestComponent, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(it.remainingBalance, currency)}
                        </TableCell>
                        <TableCell className="pr-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium',
                              paid ? 'bg-income/10 text-income' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {paid && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />}
                            {t(`Loans_inst_status_${it.status}`)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function AccountEditor({
  loanId,
  accounts,
  currentAccountId,
  onSaved,
  onCancel,
}: {
  loanId: string;
  accounts: Account[];
  currentAccountId: string;
  onSaved: (accountId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(currentAccountId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const dirty = selected !== currentAccountId;

  async function handleSave() {
    setSaving(true);
    setError(false);
    try {
      const loan = await updateLoanAccount(loanId, selected);
      onSaved(loan.accountId);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loan-account">{t('Loans_account_edit')}</Label>
        <select
          id="loan-account"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setError(false);
          }}
          className="h-9 w-64 rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </div>
      <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
        {t('Loans_account_save')}
      </Button>
      <Button size="sm" variant="outline" disabled={saving} onClick={onCancel}>
        {t('Loans_cancel')}
      </Button>
      {error && (
        <span className="pb-2 text-[12px] font-medium text-expense">{t('Loans_account_error')}</span>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-heading text-lg font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
