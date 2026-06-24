import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Wallet01Icon, PencilEdit02Icon, BankIcon, Coins01Icon } from '@hugeicons/core-free-icons';

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
import { useCurrencyFormatter } from '@/lib/currency';
import { accountSchema, type AccountFormData } from './account.schema';
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  type Account,
} from './accounts.api';

export default function Accounts() {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // null = dialog closed; { account: null } = create; { account } = edit.
  const [editing, setEditing] = useState<{ account: Account | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccounts()
      .then((res) => {
        if (!cancelled) {
          setAccounts(res);
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

  // Reset the spinner from the (user-driven) handler so the effect itself never
  // sets state synchronously.
  const reload = () => {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-7xl px-7 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {t('Accounts_title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('Accounts_subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ account: null })}>
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          {t('Accounts_new')}
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : accounts.length === 0 ? (
          <EmptyState onCreate={() => setEditing({ account: null })} />
        ) : (
          <Card>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{t('Accounts_col_name')}</TableHead>
                    <TableHead>{t('Accounts_col_type')}</TableHead>
                    <TableHead className="text-right">{t('Accounts_col_balance')}</TableHead>
                    <TableHead className="pr-4 text-right">{t('Accounts_col_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="pl-4 font-medium text-foreground">
                        {account.name}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <HugeiconsIcon
                            icon={account.type === 'bank' ? BankIcon : Coins01Icon}
                            size={14}
                          />
                          {t(`Accounts_type_${account.type}`)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(account.currentBalance, account.currency)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('Accounts_edit')}
                          onClick={() => setEditing({ account })}
                        >
                          <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {editing && (
        <AccountDialog
          account={editing.account}
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

function AccountDialog({
  account,
  onClose,
  onSaved,
}: {
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = account !== null;
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: account?.name ?? '',
      type: account?.type ?? 'bank',
      currentBalance: account?.currentBalance ?? '0',
      currency: account?.currency ?? 'EUR',
    },
  });

  const onSubmit = async (data: AccountFormData) => {
    setRootError(null);
    try {
      if (isEdit) {
        await updateAccount(account.id, data);
      } else {
        await createAccount(data);
      }
      onSaved();
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : t('Accounts_error_save');
      setRootError(message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(isEdit ? 'Accounts_edit_title' : 'Accounts_new_title')}</DialogTitle>
          <DialogDescription>{t('Accounts_dialog_subtitle')}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t('Accounts_col_name')}</Label>
            <Input
              id="name"
              autoFocus
              placeholder={t('Accounts_name_placeholder')}
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <p className="text-[12px] text-expense">{t(errors.name.message!)}</p>}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="type">{t('Accounts_col_type')}</Label>
              <select
                id="type"
                aria-invalid={!!errors.type}
                className="h-9 w-full rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                {...register('type')}
              >
                <option value="bank">{t('Accounts_type_bank')}</option>
                <option value="cash">{t('Accounts_type_cash')}</option>
              </select>
            </div>

            <div className="flex w-24 flex-col gap-1.5">
              <Label htmlFor="currency">{t('Accounts_col_currency')}</Label>
              <Input
                id="currency"
                maxLength={3}
                placeholder="EUR"
                className="uppercase"
                aria-invalid={!!errors.currency}
                {...register('currency')}
              />
            </div>
          </div>
          {errors.currency && (
            <p className="-mt-2 text-[12px] text-expense">{t(errors.currency.message!)}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentBalance">{t('Accounts_col_balance')}</Label>
            <Input
              id="currentBalance"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              aria-invalid={!!errors.currentBalance}
              {...register('currentBalance')}
            />
            {errors.currentBalance && (
              <p className="text-[12px] text-expense">{t(errors.currentBalance.message!)}</p>
            )}
          </div>

          {rootError && <p className="text-[13px] text-expense">{rootError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Accounts_cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t(isEdit ? 'Accounts_save' : 'Accounts_create')}
            </Button>
          </DialogFooter>
        </form>
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
          <HugeiconsIcon icon={Wallet01Icon} size={22} />
        </span>
        <p className="text-sm font-medium text-foreground">{t('Accounts_empty_title')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{t('Accounts_empty_subtitle')}</p>
        <Button size="sm" onClick={onCreate}>
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          {t('Accounts_new')}
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
        <p className="text-sm text-muted-foreground">{t('Accounts_error')}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('Accounts_retry')}
        </Button>
      </CardContent>
    </Card>
  );
}
