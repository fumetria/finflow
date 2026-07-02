import * as z from 'zod';

// Reusable response schemas for the OpenAPI document. Each is tagged with a
// `.meta({ id })` so zod-openapi registers it as a named component ($ref)
// instead of inlining it on every operation.
//
// Money fields are Postgres `numeric` → serialized as decimal strings ("0.00").
// Timestamps are `Date` → serialized by Express as ISO 8601 strings.

const isoDateTime = z.iso.datetime();

const timestamps = {
  createdAt: isoDateTime,
  updatedAt: isoDateTime.nullable(),
  deletedAt: isoDateTime.nullable(),
};

export const errorSchema = z
  .object({
    code: z.string().meta({ example: 'ACCOUNT_NOT_FOUND' }),
    message: z.string().meta({ example: 'Not found any account with this id' }),
  })
  .meta({ id: 'Error', description: 'Standard error envelope' });

export const tokenSchema = z
  .object({ token: z.string().meta({ description: 'Signed JWT' }) })
  .meta({ id: 'TokenResponse' });

export const accountSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    type: z.enum(['bank', 'cash']),
    currentBalance: z.string().meta({ example: '1500.00' }),
    currency: z.string().meta({ example: 'EUR' }),
    ...timestamps,
  })
  .meta({ id: 'Account' });

export const expenseSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    accountId: z.uuid(),
    entityId: z.uuid().nullable(),
    categoryId: z.uuid().nullable(),
    concept: z.string(),
    amount: z.string().meta({ example: '49.99' }),
    dueDate: isoDateTime,
    status: z.enum(['pending', 'paid']),
    paidAt: isoDateTime.nullable(),
    dueSoonNotifiedAt: isoDateTime.nullable(),
    notes: z.string().nullable(),
    recurringRuleId: z.uuid().nullable(),
    ...timestamps,
  })
  .meta({ id: 'Expense' });

export const recurringRuleSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    accountId: z.uuid(),
    concept: z.string(),
    entityId: z.uuid().nullable(),
    categoryId: z.uuid().nullable(),
    amount: z.string().nullable(),
    frequency: z.enum(['monthly', 'quarterly', 'yearly', 'weekly', 'biannual']),
    dayOfMonth: z.number().int().nullable(),
    startDate: isoDateTime.nullable(),
    endDate: isoDateTime.nullable(),
    active: z.boolean().nullable(),
    notes: z.string().nullable(),
    ...timestamps,
  })
  .meta({ id: 'RecurringRule' });

export const expenseCategorySchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    ...timestamps,
  })
  .meta({ id: 'ExpenseCategory' });

export const loanSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    accountId: z.uuid(),
    entityId: z.uuid().nullable(),
    concept: z.string(),
    principal: z.string().meta({ example: '12000.00' }),
    annualRate: z.string().meta({ example: '7.5000' }),
    termMonths: z.number().int(),
    startDate: isoDateTime,
    status: z.enum(['active', 'paid', 'cancelled']),
    notes: z.string().nullable(),
    ...timestamps,
  })
  .meta({ id: 'Loan' });

export const loanInstallmentSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    loanId: z.uuid(),
    number: z.number().int(),
    dueDate: isoDateTime,
    amount: z.string(),
    principalComponent: z.string(),
    interestComponent: z.string(),
    remainingBalance: z.string(),
    status: z.enum(['pending', 'paid']),
    expenseId: z.uuid().nullable(),
    ...timestamps,
  })
  .meta({ id: 'LoanInstallment' });

export const loanWithInstallmentsSchema = z
  .object({
    loan: loanSchema,
    installments: z.array(loanInstallmentSchema),
  })
  .meta({ id: 'LoanWithInstallments' });

export const forecastSchema = z
  .object({
    date: z.iso.date(),
    accounts: z.array(
      z.object({
        accountId: z.uuid(),
        name: z.string(),
        currency: z.string(),
        currentBalance: z.string(),
        pendingUntilDate: z.string(),
        projectedBalance: z.string(),
        shortfall: z.string(),
      }),
    ),
    categoryBreakdown: z.array(
      z.object({
        categoryId: z.uuid().nullable(),
        name: z.string().nullable(),
        total: z.string(),
      }),
    ),
    totals: z.object({
      currency: z.string(),
      currentBalance: z.string(),
      pendingUntilDate: z.string(),
      projectedBalance: z.string(),
    }),
  })
  .meta({ id: 'Forecast' });
