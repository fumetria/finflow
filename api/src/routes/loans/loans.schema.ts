import * as z from 'zod';

export const createLoanSchema = z.object({
  accountId: z.uuid(),
  entityId: z.uuid().nullable().optional(),
  concept: z.string().max(255),
  principal: z.coerce.number().positive().multipleOf(0.01),
  annualRate: z.coerce.number().min(0), // nominal annual rate as a percentage, e.g. 7.5
  termMonths: z.coerce.number().int().positive(),
  startDate: z.iso.datetime(),
  notes: z.string().nullable().optional(),
});

export type CreateLoan = z.infer<typeof createLoanSchema>;
