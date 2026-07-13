import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
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
import { loanReviseSchema, type LoanReviseFormData } from './loan.schema';
import {
  fetchLoan,
  updateLoanAccount,
  reviseLoan,
  deleteLoan,
  type Loan,
  type LoanDetail as LoanDetailData,
} from './loans.api';

// Remount the view when the loan id changes so its data-loading effect starts
// from a clean state (no synchronous setState needed inside the effect).
export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  return <LoanDetailView key={id} id={id} />;
}

function LoanDetailView({ id }: { id: string | undefined }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const [data, setData] = useState<LoanDetailData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingLoan, setEditingLoan] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Outstanding capital = remaining balance after the last paid installment, or
  // the principal if none is paid; the number of pending installments is the
  // default remaining term for the revise form.
  const { outstanding, pendingCount } = useMemo(() => {
    if (!data) return { outstanding: 0, pendingCount: 0 };
    const paid = data.installments.filter((it) => it.status === 'paid');
    const last = paid.at(-1);
    return {
      outstanding: last ? Number(last.remainingBalance) : Number(data.loan.principal),
      pendingCount: data.installments.length - paid.length,
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl px-7 py-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/loans">
          <Icon name="arrow-thin-left-circle" size={16} />
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
          <div className="flex items-start justify-between gap-4">
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
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingLoan(true)}>
                <Icon name="edit" size={16} />
                {t('Loans_edit')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
                <Icon name="trash" size={16} />
                {t('Loans_delete')}
              </Button>
            </div>
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
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryStat
              label={t('Loans_col_principal')}
              value={formatCurrency(data.loan.principal, currency)}
            />
            <SummaryStat
              label={t('Loans_outstanding_label')}
              value={formatCurrency(outstanding.toFixed(2), currency)}
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
                            {paid && <Icon name="check" size={12} />}
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

          {editingLoan && (
            <LoanEditDialog
              loan={data.loan}
              outstanding={outstanding}
              pendingCount={pendingCount}
              onClose={() => setEditingLoan(false)}
              onSaved={(detail) => {
                setData(detail);
                setEditingLoan(false);
              }}
            />
          )}

          {deleting && (
            <DeleteLoanDialog
              loan={data.loan}
              onClose={() => setDeleting(false)}
              onDeleted={() => navigate('/loans')}
            />
          )}
        </>
      )}
    </div>
  );
}

function LoanEditDialog({
  loan,
  outstanding,
  pendingCount,
  onClose,
  onSaved,
}: {
  loan: Loan;
  outstanding: number;
  pendingCount: number;
  onClose: () => void;
  onSaved: (detail: LoanDetailData) => void;
}) {
  const { t } = useTranslation();
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoanReviseFormData>({
    resolver: zodResolver(loanReviseSchema),
    defaultValues: {
      concept: loan.concept,
      annualRate: String(Number(loan.annualRate)),
      outstandingCapital: outstanding.toFixed(2),
      remainingTerm: String(pendingCount),
      notes: loan.notes ?? '',
    },
  });

  const onSubmit = async (formData: LoanReviseFormData) => {
    setRootError(null);
    try {
      const detail = await reviseLoan(loan.id, {
        concept: formData.concept,
        entityId: loan.entityId,
        annualRate: Number(formData.annualRate),
        outstandingCapital: Number(formData.outstandingCapital),
        remainingTerm: Number(formData.remainingTerm),
        notes: formData.notes ? formData.notes : null,
      });
      onSaved(detail);
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : t('Loans_error_edit');
      setRootError(message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Loans_edit_title')}</DialogTitle>
          <DialogDescription>{t('Loans_edit_hint')}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-concept">{t('Loans_col_concept')}</Label>
            <Input
              id="edit-concept"
              autoFocus
              aria-invalid={!!errors.concept}
              {...register('concept')}
            />
            {errors.concept && (
              <p className="text-[12px] text-expense">{t(errors.concept.message!)}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-outstanding">{t('Loans_outstanding_label')}</Label>
              <Input
                id="edit-outstanding"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                aria-invalid={!!errors.outstandingCapital}
                {...register('outstandingCapital')}
              />
              {errors.outstandingCapital && (
                <p className="text-[12px] text-expense">{t(errors.outstandingCapital.message!)}</p>
              )}
            </div>

            <div className="flex w-28 flex-col gap-1.5">
              <Label htmlFor="edit-rate">{t('Loans_rate_label')}</Label>
              <Input
                id="edit-rate"
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

          <div className="flex w-40 flex-col gap-1.5">
            <Label htmlFor="edit-remaining-term">{t('Loans_remaining_term_label')}</Label>
            <Input
              id="edit-remaining-term"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-invalid={!!errors.remainingTerm}
              {...register('remainingTerm')}
            />
            {errors.remainingTerm && (
              <p className="text-[12px] text-expense">{t(errors.remainingTerm.message!)}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">{t('Loans_col_notes')}</Label>
            <textarea
              id="edit-notes"
              rows={2}
              placeholder={t('Loans_notes_placeholder')}
              className="w-full resize-none rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
              {...register('notes')}
            />
          </div>

          {rootError && <p className="text-[13px] text-expense">{rootError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Loans_cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t('Loans_save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLoanDialog({
  loan,
  onClose,
  onDeleted,
}: {
  loan: Loan;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handleDelete() {
    setBusy(true);
    setError(false);
    try {
      await deleteLoan(loan.id);
      onDeleted();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('Loans_delete_title')}</DialogTitle>
          <DialogDescription>
            {t('Loans_delete_confirm', { concept: loan.concept })}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-[13px] text-expense">{t('Loans_error_delete')}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Loans_cancel')}
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={handleDelete}>
            {t('Loans_delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
