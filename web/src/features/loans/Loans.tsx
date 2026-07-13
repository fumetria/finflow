import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import { Icon } from '@/components/icon/Icon';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/lib/currency';
import { fetchAccounts, type Account } from '@/features/accounts/accounts.api';
import { loanSchema, type LoanFormData } from './loan.schema';
import {
  fetchLoans,
  createLoan,
  materializeLoans,
  type Loan,
  type LoanStatus,
} from './loans.api';

function toInputValue(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const STATUS_STYLES: Record<LoanStatus, string> = {
  active: 'bg-brand/10 text-brand',
  paid: 'bg-income/10 text-income',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function Loans() {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const navigate = useNavigate();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [materializing, setMaterializing] = useState(false);
  const [matResult, setMatResult] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLoans(), fetchAccounts()])
      .then(([l, acc]) => {
        if (!cancelled) {
          setLoans(l);
          setAccounts(acc);
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
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  };

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  async function handleMaterialize() {
    setMaterializing(true);
    setMatResult(null);
    try {
      const { materialized } = await materializeLoans();
      setMatResult(materialized);
      reload();
    } catch {
      setMatResult(null);
    } finally {
      setMaterializing(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-7 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">{t('Loans_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('Loans_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={materializing || loans.length === 0}
            onClick={handleMaterialize}
          >
            <Icon name="refresh" size={16} />
            {t('Loans_materialize')}
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Icon name="add" size={16} />
            {t('Loans_new')}
          </Button>
        </div>
      </div>

      {matResult !== null && (
        <div className="mt-4 rounded-md bg-income/10 px-3 py-2 text-xs font-medium text-income">
          {t('Loans_materialized', { count: matResult })}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : loans.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <Card>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{t('Loans_col_concept')}</TableHead>
                    <TableHead>{t('Loans_col_account')}</TableHead>
                    <TableHead className="text-right">{t('Loans_col_principal')}</TableHead>
                    <TableHead className="text-right">{t('Loans_col_rate')}</TableHead>
                    <TableHead className="text-right">{t('Loans_col_term')}</TableHead>
                    <TableHead>{t('Loans_col_status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => {
                    const account = accountsById.get(loan.accountId);
                    return (
                      <TableRow
                        key={loan.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/loans/${loan.id}`)}
                      >
                        <TableCell className="pl-4 font-medium text-foreground">
                          {loan.concept}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {account?.name ?? (
                            <span className="italic">{t('Loans_account_unknown')}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(loan.principal, account?.currency ?? 'EUR')}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {Number(loan.annualRate)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {t('Loans_months', { count: loan.termMonths })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium',
                              STATUS_STYLES[loan.status],
                            )}
                          >
                            {t(`Loans_status_${loan.status}`)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {creating && (
        <LoanDialog
          accounts={accounts}
          onClose={() => setCreating(false)}
          onCreated={(id) => navigate(`/loans/${id}`)}
        />
      )}
    </div>
  );
}

function LoanDialog({
  accounts,
  onClose,
  onCreated,
}: {
  accounts: Account[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [rootError, setRootError] = useState<string | null>(null);
  const hasAccounts = accounts.length > 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      accountId: accounts[0]?.id ?? '',
      concept: '',
      principal: '',
      annualRate: '',
      termMonths: '',
      startDate: toInputValue(new Date()),
      notes: '',
    },
  });

  const onSubmit = async (data: LoanFormData) => {
    setRootError(null);
    try {
      const id = await createLoan({
        accountId: data.accountId,
        concept: data.concept,
        principal: Number(data.principal),
        annualRate: Number(data.annualRate),
        termMonths: Number(data.termMonths),
        startDate: new Date(`${data.startDate}T00:00:00.000Z`).toISOString(),
        notes: data.notes ? data.notes : null,
      });
      onCreated(id);
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : t('Loans_error_save');
      setRootError(message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Loans_new_title')}</DialogTitle>
          <DialogDescription>{t('Loans_dialog_subtitle')}</DialogDescription>
        </DialogHeader>

        {!hasAccounts ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t('Loans_no_accounts')}</p>
            <Button asChild size="sm">
              <Link to="/accounts">{t('Loans_no_accounts_cta')}</Link>
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concept">{t('Loans_col_concept')}</Label>
              <Input
                id="concept"
                autoFocus
                placeholder={t('Loans_concept_placeholder')}
                aria-invalid={!!errors.concept}
                {...register('concept')}
              />
              {errors.concept && (
                <p className="text-[12px] text-expense">{t(errors.concept.message!)}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accountId">{t('Loans_col_account')}</Label>
              <select
                id="accountId"
                aria-invalid={!!errors.accountId}
                className="h-9 w-full rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                {...register('accountId')}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
              {errors.accountId && (
                <p className="text-[12px] text-expense">{t(errors.accountId.message!)}</p>
              )}
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="principal">{t('Loans_col_principal')}</Label>
                <Input
                  id="principal"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  aria-invalid={!!errors.principal}
                  {...register('principal')}
                />
                {errors.principal && (
                  <p className="text-[12px] text-expense">{t(errors.principal.message!)}</p>
                )}
              </div>

              <div className="flex w-28 flex-col gap-1.5">
                <Label htmlFor="annualRate">{t('Loans_rate_label')}</Label>
                <Input
                  id="annualRate"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="7.5"
                  aria-invalid={!!errors.annualRate}
                  {...register('annualRate')}
                />
                {errors.annualRate && (
                  <p className="text-[12px] text-expense">{t(errors.annualRate.message!)}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex w-32 flex-col gap-1.5">
                <Label htmlFor="termMonths">{t('Loans_term_label')}</Label>
                <Input
                  id="termMonths"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  aria-invalid={!!errors.termMonths}
                  {...register('termMonths')}
                />
                {errors.termMonths && (
                  <p className="text-[12px] text-expense">{t(errors.termMonths.message!)}</p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="startDate">{t('Loans_start_label')}</Label>
                <Input
                  id="startDate"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-[12px] text-expense">{t(errors.startDate.message!)}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">{t('Loans_col_notes')}</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder={t('Loans_notes_placeholder')}
                className="w-full resize-none rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                {...register('notes')}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">{t('Loans_schedule_hint')}</p>

            {rootError && <p className="text-[13px] text-expense">{rootError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('Loans_cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t('Loans_create')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded bg-muted" />
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="items-center py-12 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="library" size={22} />
        </span>
        <p className="text-sm font-medium text-foreground">{t('Loans_empty_title')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{t('Loans_empty_subtitle')}</p>
        <Button size="sm" onClick={onCreate}>
          <Icon name="add" size={16} />
          {t('Loans_new')}
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
        <p className="text-sm text-muted-foreground">{t('Loans_error')}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('Loans_retry')}
        </Button>
      </CardContent>
    </Card>
  );
}
