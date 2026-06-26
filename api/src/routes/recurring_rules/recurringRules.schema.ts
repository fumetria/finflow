import * as z from 'zod';

export const createRecurringRuleSchema = z.object({
  accountId: z.uuid(),
  concept: z.string().max(255),
  amount: z.coerce.number().positive().multipleOf(0.01),
  frequency: z.enum(['monthly', 'quarterly', 'yearly', 'weekly', 'biannual']),
  dayOfMonth: z.number().optional(),
  startDate: z.iso.datetime(),
  entityId: z.uuid().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  endDate: z.iso.datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateRecurringRuleSchema = z
  .object({
    concept: z.string().max(255).optional(),
    amount: z.coerce.number().positive().multipleOf(0.01).optional(),
    frequency: z.enum(['monthly', 'quarterly', 'yearly', 'weekly', 'biannual']).optional(),
    dayOfMonth: z.number().optional(),
    startDate: z.iso.datetime().optional(),
    entityId: z.uuid().nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    endDate: z.iso.datetime().nullable().optional(),
    active: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .partial();

export type CreateRecurringRule = z.infer<typeof createRecurringRuleSchema>;
export type UpdateRecurringRule = z.infer<typeof updateRecurringRuleSchema>;
