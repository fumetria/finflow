import * as z from 'zod';

// Mirrors the backend's createRecurringRuleSchema. Form values are strings;
// amount/dayOfMonth/dates are converted when building the payload (Recurring.tsx).
export const recurringSchema = z
  .object({
    accountId: z.string().min(1, 'Recurring_error_account'),
    concept: z
      .string()
      .trim()
      .min(1, 'Recurring_error_concept')
      .max(255, 'Recurring_error_concept_long'),
    amount: z
      .string()
      .trim()
      .refine((v) => v !== '' && Number(v) > 0, { message: 'Recurring_error_amount' })
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), {
        message: 'Recurring_error_amount_decimals',
      }),
    frequency: z.enum(['monthly', 'quarterly', 'biannual', 'yearly', 'weekly']),
    // Empty string = "use the start date's day". Validated only when provided.
    dayOfMonth: z
      .string()
      .trim()
      .refine((v) => v === '' || (/^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 31), {
        message: 'Recurring_error_day',
      }),
    startDate: z.string().min(1, 'Recurring_error_start'),
    endDate: z.string(),
    notes: z.string().trim().max(2000, 'Recurring_error_notes_long').optional(),
  })
  .refine((d) => d.endDate === '' || d.endDate >= d.startDate, {
    message: 'Recurring_error_end_before_start',
    path: ['endDate'],
  });

export type RecurringFormData = z.infer<typeof recurringSchema>;
