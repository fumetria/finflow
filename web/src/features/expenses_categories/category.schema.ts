import * as z from 'zod';

// Mirrors the backend's createExpenseCategorySchema (expensesCategories.schemas.ts).
export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Categories_error_name')
    .max(100, 'Categories_error_name_long'),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
