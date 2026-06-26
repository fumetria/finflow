import * as z from 'zod';

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial();

export type createExpenseCategory = z.infer<typeof createExpenseCategorySchema>;
export type updateExpenseCategory = z.infer<typeof updateExpenseCategorySchema>;
