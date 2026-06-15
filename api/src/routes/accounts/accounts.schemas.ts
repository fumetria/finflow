import * as z from 'zod';

export const createAccountSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['bank', 'cash']).default('cash'),
  currentBalance: z.string().default('0'),
  currency: z.string().max(3).uppercase().default('EUR'),
});

export const updateAccountSchema = z
  .object({
    name: z.string().max(100),
    type: z.enum(['bank', 'cash']).default('cash'),
    currentBalance: z.string().default('0'),
    currency: z.string().max(3).uppercase().default('EUR'),
  })
  .partial();

export type createAccount = z.infer<typeof createAccountSchema>;
export type updateAccount = z.infer<typeof updateAccountSchema>;
