import * as z from 'zod';

export const createExpenseSchema = z.object({
  accountId: z.uuid(),
  entityId: z.uuid().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  concept: z.string().max(255),
  amount: z.coerce.number().positive().multipleOf(0.01),
  dueDate: z.iso.datetime(),
  notes: z.string().nullable().optional(),
});

export const updateExpenseSchema = z
  .object({
    accountId: z.uuid(),
    entityId: z.uuid().nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    concept: z.string().max(255),
    amount: z.coerce.number().positive().multipleOf(0.01),
    dueDate: z.iso.datetime(),
    notes: z.string().nullable().optional(),
  })
  .partial();

export const markAsPaidSchema = z.object({
  paidAt: z.iso.datetime().optional().nullable(),
});

export type CreateExpense = z.infer<typeof createExpenseSchema>;
export type UpdateExpense = z.infer<typeof updateExpenseSchema>;
export type MarkAsPaid = z.infer<typeof markAsPaidSchema>;
