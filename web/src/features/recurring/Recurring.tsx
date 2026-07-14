import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
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
import { fetchCategories, type Category } from '@/features/expenses_categories/categories.api';
import { recurringSchema, type RecurringFormData } from './recurring.schema';
import {
  fetchRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  generateRecurringExpenses,
  type RecurringRule,
  type Frequency,
  type GenerateResult,
} from './recurring.api';

const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'biannual', 'yearly', 'weekly'];

function toInputValue(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// YYYY-MM-DD at midnight UTC as ISO datetime (matches backend's UTC date math).
function toIsoUtc(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
}

export default function Recurring() {
  const { t, i18n } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<{ rule: RecurringRule | null } | null>(null);
  const [deleting, setDeleting] = useState<RecurringRule | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRecurringRules(), fetchAccounts(), fetchCategories()])
      .then(([r, acc, cats]) => {
        if (!cancelled) {
          setRules(r);
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

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }),
    [i18n.language],
  );

  async function handleToggle(rule: RecurringRule) {
    setTogglingId(rule.id);
    try {
      await updateRecurringRule(rule.id, { active: !(rule.active ?? true) });
    } finally {
      setTogglingId(null);
      reload();
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await generateRecurringExpenses();
      setGenResult(result);
      reload();
    } catch {
      setGenResult(null);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {t('Recurring_title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('Recurring_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={generating || rules.length === 0}
            onClick={handleGenerate}
          >
            <Icon name="refresh" size={16} />
            {t('Recurring_generate')}
          </Button>
          <Button size="sm" onClick={() => setEditing({ rule: null })}>
            <Icon name="add" size={16} />
            {t('Recurring_new')}
          </Button>
        </div>
      </div>

      {genResult && (
        <div className="mt-4 rounded-md bg-income/10 px-3 py-2 text-xs font-medium text-income">
          {t('Recurring_generated', { generated: genResult.generated, skipped: genResult.skipped })}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : rules.length === 0 ? (
          <EmptyState onCreate={() => setEditing({ rule: null })} />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {rules.map((rule) => {
                const account = accountsById.get(rule.accountId);
                const active = rule.active ?? true;
                return (
                  <Card key={rule.id} className={cn(!active && 'opacity-55')}>
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {rule.concept}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {account?.name ?? (
                              <span className="italic">
                                {t('Recurring_account_unknown')}
                              </span>
                            )}{' '}
                            · {t(`Recurring_freq_${rule.frequency}`)}
                            {rule.frequency !== 'weekly' && rule.dayOfMonth
                              ? ` · ${t('Recurring_day_short', { day: rule.dayOfMonth })}`
                              : ''}
                          </p>
                        </div>
                        <span className="shrink-0 tabular-nums font-medium text-expense">
                          {rule.amount
                            ? `−${formatCurrency(rule.amount, account?.currency ?? 'EUR')}`
                            : '—'}
                        </span>
                      </div>
                      {(rule.startDate || rule.endDate) && (
                        <p className="text-xs text-muted-foreground">
                          {rule.startDate ? dateFmt.format(new Date(rule.startDate)) : '—'}
                          {rule.endDate
                            ? ` → ${dateFmt.format(new Date(rule.endDate))}`
                            : ''}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={togglingId === rule.id}
                          onClick={() => handleToggle(rule)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50',
                            active ? 'text-income' : 'text-muted-foreground',
                          )}
                          aria-label={t(active ? 'Recurring_pause' : 'Recurring_resume')}
                        >
                          <Icon name={active ? 'toggle-on' : 'toggle-off'} size={18} />
                          {t(active ? 'Recurring_active' : 'Recurring_paused')}
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('Recurring_edit')}
                            onClick={() => setEditing({ rule })}
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('Recurring_delete')}
                            onClick={() => setDeleting(rule)}
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop: table */}
            <Card className="hidden md:block">
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{t('Recurring_col_concept')}</TableHead>
                    <TableHead>{t('Recurring_col_account')}</TableHead>
                    <TableHead>{t('Recurring_col_frequency')}</TableHead>
                    <TableHead className="text-right">{t('Recurring_col_amount')}</TableHead>
                    <TableHead>{t('Recurring_col_period')}</TableHead>
                    <TableHead>{t('Recurring_col_active')}</TableHead>
                    <TableHead className="pr-4 text-right">{t('Recurring_col_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => {
                    const account = accountsById.get(rule.accountId);
                    const active = rule.active ?? true;
                    return (
                      <TableRow key={rule.id} className={cn(!active && 'opacity-55')}>
                        <TableCell className="pl-4 font-medium text-foreground">
                          {rule.concept}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {account?.name ?? (
                            <span className="italic">{t('Recurring_account_unknown')}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t(`Recurring_freq_${rule.frequency}`)}
                          {rule.frequency !== 'weekly' && rule.dayOfMonth
                            ? ` · ${t('Recurring_day_short', { day: rule.dayOfMonth })}`
                            : ''}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-expense">
                          {rule.amount
                            ? `−${formatCurrency(rule.amount, account?.currency ?? 'EUR')}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rule.startDate ? dateFmt.format(new Date(rule.startDate)) : '—'}
                          {rule.endDate ? ` → ${dateFmt.format(new Date(rule.endDate))}` : ''}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            disabled={togglingId === rule.id}
                            onClick={() => handleToggle(rule)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50',
                              active ? 'text-income' : 'text-muted-foreground',
                            )}
                            aria-label={t(active ? 'Recurring_pause' : 'Recurring_resume')}
                          >
                            <Icon name={active ? 'toggle-on' : 'toggle-off'} size={18} />
                            {t(active ? 'Recurring_active' : 'Recurring_paused')}
                          </button>
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('Recurring_edit')}
                              onClick={() => setEditing({ rule })}
                            >
                              <Icon name="edit" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('Recurring_delete')}
                              onClick={() => setDeleting(rule)}
                            >
                              <Icon name="trash" size={16} />
                            </Button>
                          </div>
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

      {editing && (
        <RuleDialog
          rule={editing.rule}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          rule={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function RuleDialog({
  rule,
  accounts,
  categories,
  onClose,
  onSaved,
}: {
  rule: RecurringRule | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = rule !== null;
  const [rootError, setRootError] = useState<string | null>(null);
  const hasAccounts = accounts.length > 0;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      accountId: rule?.accountId ?? accounts[0]?.id ?? '',
      concept: rule?.concept ?? '',
      amount: rule?.amount ?? '',
      frequency: rule?.frequency ?? 'monthly',
      dayOfMonth: rule?.dayOfMonth != null ? String(rule.dayOfMonth) : '',
      startDate: rule?.startDate ? rule.startDate.slice(0, 10) : toInputValue(new Date()),
      endDate: rule?.endDate ? rule.endDate.slice(0, 10) : '',
      categoryId: rule?.categoryId ?? '',
      notes: rule?.notes ?? '',
    },
  });

  const frequency = useWatch({ control, name: 'frequency' });
  const showDayOfMonth = frequency !== 'weekly';

  const onSubmit = async (data: RecurringFormData) => {
    setRootError(null);
    try {
      const common = {
        concept: data.concept,
        amount: Number(data.amount),
        frequency: data.frequency,
        dayOfMonth:
          showDayOfMonth && data.dayOfMonth !== '' ? Number(data.dayOfMonth) : undefined,
        startDate: toIsoUtc(data.startDate),
        endDate: data.endDate ? toIsoUtc(data.endDate) : null,
        categoryId: data.categoryId ? data.categoryId : null,
        notes: data.notes ? data.notes : null,
      };
      if (isEdit) {
        // The backend update schema doesn't accept accountId.
        await updateRecurringRule(rule.id, common);
      } else {
        await createRecurringRule({ accountId: data.accountId, ...common });
      }
      onSaved();
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : t('Recurring_error_save');
      setRootError(message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(isEdit ? 'Recurring_edit_title' : 'Recurring_new_title')}</DialogTitle>
          <DialogDescription>{t('Recurring_dialog_subtitle')}</DialogDescription>
        </DialogHeader>

        {!hasAccounts ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t('Recurring_no_accounts')}</p>
            <Button asChild size="sm">
              <Link to="/accounts">{t('Recurring_no_accounts_cta')}</Link>
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concept">{t('Recurring_col_concept')}</Label>
              <Input
                id="concept"
                autoFocus
                placeholder={t('Recurring_concept_placeholder')}
                aria-invalid={!!errors.concept}
                {...register('concept')}
              />
              {errors.concept && (
                <p className="text-[12px] text-expense">{t(errors.concept.message!)}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accountId">{t('Recurring_col_account')}</Label>
              <select
                id="accountId"
                disabled={isEdit}
                aria-invalid={!!errors.accountId}
                className="h-9 w-full rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30"
                {...register('accountId')}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="text-[11px] text-muted-foreground">{t('Recurring_account_locked')}</p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="amount">{t('Recurring_col_amount')}</Label>
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
                <Label htmlFor="frequency">{t('Recurring_col_frequency')}</Label>
                <select
                  id="frequency"
                  className="h-9 w-full rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                  {...register('frequency')}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {t(`Recurring_freq_${f}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="startDate">{t('Recurring_col_start')}</Label>
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

              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="endDate">{t('Recurring_col_end_optional')}</Label>
                <Input
                  id="endDate"
                  type="date"
                  aria-invalid={!!errors.endDate}
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <p className="text-[12px] text-expense">{t(errors.endDate.message!)}</p>
                )}
              </div>
            </div>

            {showDayOfMonth && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dayOfMonth">{t('Recurring_day_label')}</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  inputMode="numeric"
                  placeholder={t('Recurring_day_placeholder')}
                  aria-invalid={!!errors.dayOfMonth}
                  {...register('dayOfMonth')}
                />
                {errors.dayOfMonth && (
                  <p className="text-[12px] text-expense">{t(errors.dayOfMonth.message!)}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">{t('Recurring_col_category')}</Label>
              <select
                id="categoryId"
                className="h-9 w-full rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                {...register('categoryId')}
              >
                <option value="">{t('Recurring_category_none')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">{t('Recurring_col_notes')}</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder={t('Recurring_notes_placeholder')}
                className="w-full resize-none rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                {...register('notes')}
              />
            </div>

            {rootError && <p className="text-[13px] text-expense">{rootError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('Recurring_cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t(isEdit ? 'Recurring_save' : 'Recurring_create')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  rule,
  onClose,
  onDeleted,
}: {
  rule: RecurringRule;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteRecurringRule(rule.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('Recurring_delete_title')}</DialogTitle>
          <DialogDescription>
            {t('Recurring_delete_confirm', { concept: rule.concept })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Recurring_cancel')}
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={handleDelete}>
            {t('Recurring_delete')}
          </Button>
        </DialogFooter>
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
          <Icon name="refresh" size={22} />
        </span>
        <p className="text-sm font-medium text-foreground">{t('Recurring_empty_title')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{t('Recurring_empty_subtitle')}</p>
        <Button size="sm" onClick={onCreate}>
          <Icon name="add" size={16} />
          {t('Recurring_new')}
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
        <p className="text-sm text-muted-foreground">{t('Recurring_error')}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('Recurring_retry')}
        </Button>
      </CardContent>
    </Card>
  );
}
