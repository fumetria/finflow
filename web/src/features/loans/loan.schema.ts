import * as z from 'zod';

// Mirrors the backend's createLoanSchema. Form values are strings; numbers and
// the ISO start date are built when assembling the payload (Loans.tsx).
export const loanSchema = z.object({
  accountId: z.string().min(1, 'Loans_error_account'),
  concept: z
    .string()
    .trim()
    .min(1, 'Loans_error_concept')
    .max(255, 'Loans_error_concept_long'),
  principal: z
    .string()
    .trim()
    .refine((v) => v !== '' && Number(v) > 0, { message: 'Loans_error_principal' })
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), {
      message: 'Loans_error_principal_decimals',
    }),
  // Nominal annual rate as a percentage (e.g. 7.5). 0 is allowed.
  annualRate: z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0, {
      message: 'Loans_error_rate',
    }),
  termMonths: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1, { message: 'Loans_error_term' }),
  startDate: z.string().min(1, 'Loans_error_start'),
  notes: z.string().trim().max(2000, 'Loans_error_notes_long').optional(),
});

export type LoanFormData = z.infer<typeof loanSchema>;

// Revise form: edits the pending tail of a loan (capital, rate, remaining term)
// plus metadata. Numbers are built when assembling the payload (LoanDetail.tsx).
export const loanReviseSchema = z.object({
  concept: z
    .string()
    .trim()
    .min(1, 'Loans_error_concept')
    .max(255, 'Loans_error_concept_long'),
  annualRate: z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0, {
      message: 'Loans_error_rate',
    }),
  outstandingCapital: z
    .string()
    .trim()
    .refine((v) => v !== '' && Number(v) > 0, { message: 'Loans_error_outstanding' })
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), {
      message: 'Loans_error_principal_decimals',
    }),
  remainingTerm: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1, { message: 'Loans_error_remaining_term' }),
  notes: z.string().trim().max(2000, 'Loans_error_notes_long').optional(),
});

export type LoanReviseFormData = z.infer<typeof loanReviseSchema>;
