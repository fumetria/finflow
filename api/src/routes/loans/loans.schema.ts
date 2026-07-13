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

export const updateLoanAccountSchema = z.object({
  accountId: z.uuid(),
});

export type UpdateLoanAccount = z.infer<typeof updateLoanAccountSchema>;

// Revise a loan: keeps paid installments untouched and re-amortizes the pending
// tail from `outstandingCapital` at `annualRate` over `remainingTerm` months.
// Covers rate revisions and early principal contributions.
export const reviseLoanSchema = z.object({
  concept: z.string().max(255),
  entityId: z.uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  annualRate: z.coerce.number().min(0), // nominal annual rate as a percentage
  outstandingCapital: z.coerce.number().positive().multipleOf(0.01),
  remainingTerm: z.coerce.number().int().positive(),
});

export type ReviseLoan = z.infer<typeof reviseLoanSchema>;
