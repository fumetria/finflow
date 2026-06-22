import * as z from 'zod';

// Mirrors the backend's createAccountSchema (accounts.schemas.ts). The balance is
// kept as a string to match the numeric column (and avoid float rounding); we
// validate it parses to a finite, non-negative number.
export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Accounts_error_name').max(100, 'Accounts_error_name_long'),
  type: z.enum(['bank', 'cash']),
  currentBalance: z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0, {
      message: 'Accounts_error_balance',
    }),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Accounts_error_currency'),
});

export type AccountFormData = z.infer<typeof accountSchema>;
