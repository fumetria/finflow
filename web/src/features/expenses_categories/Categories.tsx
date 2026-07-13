import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
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
import { categorySchema, type CategoryFormData } from './category.schema';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from './categories.api';

export default function Categories() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<{ category: Category | null } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((cats) => {
        if (!cancelled) {
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

  return (
    <div className="mx-auto max-w-7xl px-7 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {t('Categories_title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('Categories_subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ category: null })}>
          <Icon name="add" size={16} />
          {t('Categories_new')}
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : categories.length === 0 ? (
          <EmptyState onCreate={() => setEditing({ category: null })} />
        ) : (
          <Card>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{t('Categories_col_name')}</TableHead>
                    <TableHead className="pr-4 text-right">{t('Categories_col_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="pl-4 font-medium text-foreground">
                        {category.name}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('Categories_edit')}
                            onClick={() => setEditing({ category })}
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('Categories_delete')}
                            onClick={() => setDeleting(category)}
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        </div>
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
        <CategoryDialog
          category={editing.category}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          category={deleting}
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

function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = category !== null;
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '' },
  });

  const onSubmit = async (data: CategoryFormData) => {
    setRootError(null);
    try {
      if (isEdit) {
        await updateCategory(category.id, { name: data.name });
      } else {
        await createCategory({ name: data.name });
      }
      onSaved();
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : t('Categories_error_save');
      setRootError(message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(isEdit ? 'Categories_edit_title' : 'Categories_new_title')}</DialogTitle>
          <DialogDescription>{t('Categories_dialog_subtitle')}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t('Categories_col_name')}</Label>
            <Input
              id="name"
              autoFocus
              placeholder={t('Categories_name_placeholder')}
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <p className="text-[12px] text-expense">{t(errors.name.message!)}</p>}
          </div>

          {rootError && <p className="text-[13px] text-expense">{rootError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Categories_cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t(isEdit ? 'Categories_save' : 'Categories_create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  category,
  onClose,
  onDeleted,
}: {
  category: Category;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteCategory(category.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('Categories_delete_title')}</DialogTitle>
          <DialogDescription>
            {t('Categories_delete_confirm', { name: category.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Categories_cancel')}
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={handleDelete}>
            {t('Categories_delete')}
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
          <Icon name="tag" size={22} />
        </span>
        <p className="text-sm font-medium text-foreground">{t('Categories_empty_title')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{t('Categories_empty_subtitle')}</p>
        <Button size="sm" onClick={onCreate}>
          <Icon name="add" size={16} />
          {t('Categories_new')}
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
        <p className="text-sm text-muted-foreground">{t('Categories_error')}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('Categories_retry')}
        </Button>
      </CardContent>
    </Card>
  );
}
