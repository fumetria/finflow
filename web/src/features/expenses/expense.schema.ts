import * as z from 'zod';

// Mirrors the backend's createExpenseSchema (expenses.schemas.ts). Form values
// come from inputs as strings; amount and dueDate are converted to a number /
// ISO datetime when building the request payload (see Expenses.tsx).
export const expenseSchema = z.object({
  accountId: z.string().min(1, 'Expenses_error_account'),
  concept: z
    .string()
    .trim()
    .min(1, 'Expenses_error_concept')
    .max(255, 'Expenses_error_concept_long'),
  amount: z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)) && Number(v) > 0, {
      message: 'Expenses_error_amount',
    })
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), {
      message: 'Expenses_error_amount_decimals',
    }),
  dueDate: z.string().min(1, 'Expenses_error_due'),
  notes: z.string().trim().max(2000, 'Expenses_error_notes_long').optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
