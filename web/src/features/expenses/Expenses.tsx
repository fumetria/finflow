import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { isAxiosError } from 'axios';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  ReceiptTextIcon,
  PencilEdit02Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';

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
import { fetchCategories, type Category } from '@/features/expenses_categories/categories.api';
import { expenseSchema, type ExpenseFormData } from './expense.schema';
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  markExpensePaid,
  type Expense,
} from './expenses.api';

type StatusFilter = 'all' | 'pending' | 'paid';

// YYYY-MM-DD for <input type="date"> from a Date.
function toInputValue(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function Expenses() {
  const { t } = useTranslation();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>('all');

  // The sidebar "New expense" CTA links here with ?new=1; open the create
  // dialog straight from that initial URL state.
  const [searchParams, setSearchParams] = useSearchParams();
  // null = closed; { expense: null } = create; { expense } = edit.
  const [editing, setEditing] = useState<{ expense: Expense | null } | null>(() =>
    searchParams.get('new') === '1' ? { expense: null } : null,
  );
  const [paying, setPaying] = useState<string | null>(null);

  // Strip the ?new=1 trigger from the URL once consumed.
  useEffect(() => {
    if (searchParams.has('new')) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchExpenses(), fetchAccounts(), fetchCategories()])
      .then(([exp, acc, cats]) => {
        if (!cancelled) {
          setExpenses(exp);
          setAccounts(acc);
          setCategories(cats);
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

  const accountsById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const visible = useMemo(() => {
    const rows = filter === 'all' ? expenses : expenses.filter((e) => e.status === filter);
    return [...rows].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [expenses, filter]);

  async function handlePay(id: string) {
    setPaying(id);
    try {
      await markExpensePaid(id);
      reload();
    } catch {
      // Surface a soft failure; the list stays as-is.
      reload();
    } finally {
      setPaying(null);
    }
  }

  const FILTERS: StatusFilter[] = ['all', 'pending', 'paid'];

  return (
    <div className="mx-auto max-w-5xl px-7 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {t('Expenses_title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('Expenses_subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ expense: null })}>
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          {t('Expenses_new')}
        </Button>
      </div>

      {/* Status filter */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'secondary' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {t(`Expenses_filter_${f}`)}
          </Button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            filtered={filter !== 'all' && expenses.length > 0}
            onCreate={() => setEditing({ expense: null })}
          />
        ) : (
          <Card>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{t('Expenses_col_concept')}</TableHead>
                    <TableHead>{t('Expenses_col_account')}</TableHead>
                    <TableHead>{t('Expenses_col_due')}</TableHead>
                    <TableHead className="text-right">{t('Expenses_col_amount')}</TableHead>
                    <TableHead>{t('Expenses_col_status')}</TableHead>
                    <TableHead className="pr-4 text-right">{t('Expenses_col_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      account={accountsById.get(expense.accountId)}
                      paying={paying === expense.id}
                      onEdit={() => setEditing({ expense })}
                      onPay={() => handlePay(expense.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {editing && (
        <ExpenseDialog
          expense={editing.expense}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function ExpenseRow({
  expense,
  account,
  paying,
  onEdit,
  onPay,
}: {
  expense: Expense;
  account: Account | undefined;
  paying: boolean;
  onEdit: () => void;
  onPay: () => void;
}) {
  const { t, i18n } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const currency = account?.currency ?? 'EUR';
  const isPending = expense.status === 'pending';

  const dueLabel = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(expense.dueDate));

  return (
    <TableRow>
      <TableCell className="pl-4 font-medium text-foreground">{expense.concept}</TableCell>
      <TableCell className="text-muted-foreground">
        {account?.name ?? <span className="italic">{t('Expenses_account_unknown')}</span>}
      </TableCell>
      <TableCell className="text-muted-foreground">{dueLabel}</TableCell>
      <TableCell className="text-right tabular-nums text-expense">
        −{formatCurrency(expense.amount, currency)}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium',
            isPending ? 'bg-muted text-muted-foreground' : 'bg-income/10 text-income',
          )}
        >
          {!isPending && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />}
          {t(`Expenses_status_${expense.status}`)}
        </span>
      </TableCell>
      <TableCell className="pr-4 text-right">
        {isPending ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('Expenses_edit')}
              onClick={onEdit}
            >
              <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
            </Button>
            <Button size="xs" variant="outline" disabled={paying} onClick={onPay}>
              {t('Expenses_mark_paid')}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function ExpenseDialog({
  expense,
  accounts,
  categories,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = expense !== null;
  const [rootError, setRootError] = useState<string | null>(null);
  const hasAccounts = accounts.length > 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      accountId: expense?.accountId ?? accounts[0]?.id ?? '',
      concept: expense?.concept ?? '',
      amount: expense?.amount ?? '',
      dueDate: expense ? expense.dueDate.slice(0, 10) : toInputValue(new Date()),
      categoryId: expense?.categoryId ?? '',
      notes: expense?.notes ?? '',
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setRootError(null);
    try {
      const payload = {
        accountId: data.accountId,
        concept: data.concept,
        amount: Number(data.amount),
        // Store at midnight UTC so the date the user picks doesn't shift across
        // timezones (matches how the backend computes recurring due dates).
        dueDate: new Date(`${data.dueDate}T00:00:00.000Z`).toISOString(),
        categoryId: data.categoryId ? data.categoryId : null,
        notes: data.notes ? data.notes : null,
      };
      if (isEdit) {
        await updateExpense(expense.id, payload);
      } else {
        await createExpense(payload);
      }
      onSaved();
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : t('Expenses_error_save');
      setRootError(message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(isEdit ? 'Expenses_edit_title' : 'Expenses_new_title')}</DialogTitle>
          <DialogDescription>{t('Expenses_dialog_subtitle')}</DialogDescription>
        </DialogHeader>

        {!hasAccounts ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t('Expenses_no_accounts')}</p>
            <Button asChild size="sm">
              <Link to="/accounts">{t('Expenses_no_accounts_cta')}</Link>
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concept">{t('Expenses_col_concept')}</Label>
              <Input
                id="concept"
                autoFocus
                placeholder={t('Expenses_concept_placeholder')}
                aria-invalid={!!errors.concept}
                {...register('concept')}
              />
              {errors.concept && (
                <p className="text-[12px] text-expense">{t(errors.concept.message!)}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accountId">{t('Expenses_col_account')}</Label>
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
                <Label htmlFor="amount">{t('Expenses_col_amount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  aria-invalid={!!errors.amount}
                  {...register('amount')}
                />
                {errors.amount && (
                  <p className="text-[12px] text-expense">{t(errors.amount.message!)}</p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="dueDate">{t('Expenses_col_due')}</Label>
                <Input
                  id="dueDate"
                  type="date"
                  aria-invalid={!!errors.dueDate}
                  {...register('dueDate')}
                />
                {errors.dueDate && (
                  <p className="text-[12px] text-expense">{t(errors.dueDate.message!)}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">{t('Expenses_col_category')}</Label>
              <select
                id="categoryId"
                className="h-9 w-full rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                {...register('categoryId')}
              >
                <option value="">{t('Expenses_category_none')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">{t('Expenses_col_notes')}</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder={t('Expenses_notes_placeholder')}
                className="w-full resize-none rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                {...register('notes')}
              />
            </div>

            {rootError && <p className="text-[13px] text-expense">{rootError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('Expenses_cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t(isEdit ? 'Expenses_save' : 'Expenses_create')}
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
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded bg-muted" />
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ filtered, onCreate }: { filtered: boolean; onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="items-center py-12 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={ReceiptTextIcon} size={22} />
        </span>
        <p className="text-sm font-medium text-foreground">
          {t(filtered ? 'Expenses_empty_filtered' : 'Expenses_empty_title')}
        </p>
        {!filtered && (
          <>
            <p className="max-w-xs text-xs text-muted-foreground">{t('Expenses_empty_subtitle')}</p>
            <Button size="sm" onClick={onCreate}>
              <HugeiconsIcon icon={PlusSignIcon} size={16} />
              {t('Expenses_new')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="items-center py-12 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">{t('Expenses_error')}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('Expenses_retry')}
        </Button>
      </CardContent>
    </Card>
  );
}
