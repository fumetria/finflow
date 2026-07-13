import * as z from 'zod';
import { createDocument } from 'zod-openapi';

// Request schemas — imported from the route modules so the docs stay in sync
// with the actual Zod validation (single source of truth).
import { loginSchema, registerSchema } from '../routes/auth/auth.schemas.js';
import { createAccountSchema, updateAccountSchema } from '../routes/accounts/accounts.schemas.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  markAsPaidSchema,
} from '../routes/expenses/expenses.schemas.js';
import {
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
} from '../routes/recurring_rules/recurringRules.schema.js';
import { forecastQuerySchema } from '../routes/forecast/forecast.schema.js';
import {
  createLoanSchema,
  updateLoanAccountSchema,
  reviseLoanSchema,
} from '../routes/loans/loans.schema.js';
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
} from '../routes/expenses_categories/expensesCategories.schemas.js';

import {
  errorSchema,
  tokenSchema,
  accountSchema,
  expenseSchema,
  recurringRuleSchema,
  expenseCategorySchema,
  loanSchema,
  loanWithInstallmentsSchema,
  forecastSchema,
} from './components.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const idParam = z.object({ id: z.uuid() });

const json = (schema: z.ZodType) => ({ content: { 'application/json': { schema } } });

const errorRef = json(errorSchema);

// Error responses shared by authenticated endpoints.
const authErrors = {
  '400': { description: 'Validation error', ...errorRef },
  '401': { description: 'Missing or invalid token', ...errorRef },
} as const;

const notFound = { '404': { description: 'Resource not found', ...errorRef } } as const;

// ── Document ─────────────────────────────────────────────────────────────────

export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'finflow API',
    version: '1.0.0',
    description:
      'Personal finance control API. Projects available balance per account vs. ' +
      'pending expenses at a given date. All endpoints except `/auth/*` require a ' +
      'Bearer JWT (obtain one via `/auth/login`).',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  tags: [
    { name: 'Auth', description: 'Registration & login (public)' },
    { name: 'Accounts', description: 'Bank accounts & cash holdings' },
    { name: 'Expenses', description: 'Single payments and mark-as-paid' },
    { name: 'Recurring rules', description: 'Rules that generate future expenses' },
    { name: 'Forecast', description: 'Projected balance vs. pending expenses' },
    { name: 'Loans', description: 'Loans with amortization schedule' },
    { name: 'Expense categories', description: 'Per-user expense categories' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  // Applied to every operation; auth routes override with `security: []`.
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Auth ──────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        security: [],
        requestBody: json(registerSchema),
        responses: {
          '201': { description: 'User created, returns JWT', ...json(tokenSchema) },
          '400': { description: 'Validation error / email already used', ...errorRef },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and obtain a JWT',
        security: [],
        requestBody: json(loginSchema),
        responses: {
          '200': { description: 'Authenticated, returns JWT', ...json(tokenSchema) },
          '401': { description: 'Invalid credentials', ...errorRef },
        },
      },
    },

    // ── Accounts ──────────────────────────────────────────────────────────
    '/accounts': {
      get: {
        tags: ['Accounts'],
        summary: 'List the current user accounts',
        responses: {
          '200': {
            description: 'Accounts list',
            ...json(z.object({ userAccounts: z.array(accountSchema) })),
          },
          ...authErrors,
        },
      },
      post: {
        tags: ['Accounts'],
        summary: 'Create an account',
        requestBody: json(createAccountSchema),
        responses: {
          '201': { description: 'Created', ...json(z.object({ newAccount: accountSchema })) },
          ...authErrors,
        },
      },
    },
    '/accounts/{id}': {
      get: {
        tags: ['Accounts'],
        summary: 'Get an account by id',
        requestParams: { path: idParam },
        responses: {
          '200': { description: 'Account', ...json(z.object({ bankSelected: accountSchema })) },
          ...authErrors,
          ...notFound,
        },
      },
      patch: {
        tags: ['Accounts'],
        summary: 'Update an account',
        requestParams: { path: idParam },
        requestBody: json(updateAccountSchema),
        responses: {
          '200': { description: 'Updated', ...json(z.object({ account: accountSchema })) },
          ...authErrors,
          ...notFound,
        },
      },
    },

    // ── Expenses ──────────────────────────────────────────────────────────
    '/expenses': {
      get: {
        tags: ['Expenses'],
        summary: 'List the current user expenses',
        responses: {
          '200': {
            description: 'Expenses list',
            ...json(z.object({ userExpenses: z.array(expenseSchema) })),
          },
          ...authErrors,
        },
      },
      post: {
        tags: ['Expenses'],
        summary: 'Create an expense',
        requestBody: json(createExpenseSchema),
        responses: {
          '201': { description: 'Created', ...json(z.object({ newExpense: expenseSchema })) },
          ...authErrors,
        },
      },
    },
    '/expenses/{id}': {
      get: {
        tags: ['Expenses'],
        summary: 'Get an expense by id',
        requestParams: { path: idParam },
        responses: {
          '200': { description: 'Expense', ...json(z.object({ selectedExpense: expenseSchema })) },
          ...authErrors,
          ...notFound,
        },
      },
      patch: {
        tags: ['Expenses'],
        summary: 'Update an expense',
        requestParams: { path: idParam },
        requestBody: json(updateExpenseSchema),
        responses: {
          '200': { description: 'Updated', ...json(z.object({ updatedExpense: expenseSchema })) },
          ...authErrors,
          ...notFound,
        },
      },
    },
    '/expenses/{id}/paid': {
      patch: {
        tags: ['Expenses'],
        summary: 'Mark an expense as paid (deducts balance from the account)',
        requestParams: { path: idParam },
        requestBody: json(markAsPaidSchema),
        responses: {
          '200': { description: 'Paid', ...json(z.object({ paidExpense: expenseSchema })) },
          ...authErrors,
          ...notFound,
        },
      },
    },

    // ── Recurring rules ───────────────────────────────────────────────────
    '/recurring-rules': {
      get: {
        tags: ['Recurring rules'],
        summary: 'List recurring rules',
        responses: {
          '200': {
            description: 'Recurring rules list',
            ...json(z.object({ userRecurringRules: z.array(recurringRuleSchema) })),
          },
          ...authErrors,
        },
      },
      post: {
        tags: ['Recurring rules'],
        summary: 'Create a recurring rule',
        requestBody: json(createRecurringRuleSchema),
        responses: {
          '201': {
            description: 'Created',
            ...json(z.object({ newRecurringRule: recurringRuleSchema })),
          },
          ...authErrors,
        },
      },
    },
    '/recurring-rules/generate': {
      post: {
        tags: ['Recurring rules'],
        summary: 'Idempotently generate future expenses from active rules',
        responses: {
          '201': {
            description: 'Generation result',
            ...json(z.object({ generated: z.number().int() })),
          },
          ...authErrors,
        },
      },
    },
    '/recurring-rules/{id}': {
      get: {
        tags: ['Recurring rules'],
        summary: 'Get a recurring rule by id',
        requestParams: { path: idParam },
        responses: {
          '200': {
            description: 'Recurring rule',
            ...json(z.object({ selectedRecurringRule: recurringRuleSchema })),
          },
          ...authErrors,
          ...notFound,
        },
      },
      patch: {
        tags: ['Recurring rules'],
        summary: 'Update a recurring rule',
        requestParams: { path: idParam },
        requestBody: json(updateRecurringRuleSchema),
        responses: {
          '200': {
            description: 'Updated',
            ...json(z.object({ updatedRecurringRule: recurringRuleSchema })),
          },
          ...authErrors,
          ...notFound,
        },
      },
      delete: {
        tags: ['Recurring rules'],
        summary: 'Delete a recurring rule',
        requestParams: { path: idParam },
        responses: {
          '204': { description: 'Deleted' },
          ...authErrors,
          ...notFound,
        },
      },
    },

    // ── Forecast ──────────────────────────────────────────────────────────
    '/forecast': {
      get: {
        tags: ['Forecast'],
        summary: 'Projected balance per account vs. pending expenses until a date',
        requestParams: { query: forecastQuerySchema },
        responses: {
          '200': { description: 'Forecast', ...json(forecastSchema) },
          ...authErrors,
        },
      },
    },

    // ── Loans ─────────────────────────────────────────────────────────────
    '/loans': {
      get: {
        tags: ['Loans'],
        summary: 'List loans',
        responses: {
          '200': {
            description: 'Loans list',
            ...json(z.object({ userLoans: z.array(loanSchema) })),
          },
          ...authErrors,
        },
      },
      post: {
        tags: ['Loans'],
        summary: 'Create a loan and persist its amortization schedule',
        requestBody: json(createLoanSchema),
        responses: {
          '201': { description: 'Created', ...json(loanWithInstallmentsSchema) },
          ...authErrors,
        },
      },
    },
    '/loans/materialize': {
      post: {
        tags: ['Loans'],
        summary: 'Materialize due installments into expenses (idempotent)',
        responses: {
          '201': {
            description: 'Materialization result',
            ...json(z.object({ materialized: z.number().int() })),
          },
          ...authErrors,
        },
      },
    },
    '/loans/{id}': {
      get: {
        tags: ['Loans'],
        summary: 'Get a loan with its installments',
        requestParams: { path: idParam },
        responses: {
          '200': { description: 'Loan with installments', ...json(loanWithInstallmentsSchema) },
          ...authErrors,
          ...notFound,
        },
      },
      patch: {
        tags: ['Loans'],
        summary: 'Change the account a loan is charged to',
        requestParams: { path: idParam },
        requestBody: json(updateLoanAccountSchema),
        responses: {
          '200': { description: 'Updated', ...json(z.object({ loan: loanSchema })) },
          ...authErrors,
          ...notFound,
        },
      },
      put: {
        tags: ['Loans'],
        summary: 'Revise a loan: re-amortize the pending tail (rate/capital/term)',
        requestParams: { path: idParam },
        requestBody: json(reviseLoanSchema),
        responses: {
          '200': { description: 'Revised', ...json(loanWithInstallmentsSchema) },
          ...authErrors,
          ...notFound,
        },
      },
      delete: {
        tags: ['Loans'],
        summary: 'Delete a loan (keeps paid expenses as history)',
        requestParams: { path: idParam },
        responses: {
          '200': { description: 'Deleted', ...json(z.object({ ok: z.boolean() })) },
          ...authErrors,
          ...notFound,
        },
      },
    },

    // ── Expense categories ────────────────────────────────────────────────
    '/expenses-categories': {
      get: {
        tags: ['Expense categories'],
        summary: 'List expense categories',
        responses: {
          '200': {
            description: 'Categories list',
            ...json(z.object({ categories: z.array(expenseCategorySchema) })),
          },
          ...authErrors,
        },
      },
      post: {
        tags: ['Expense categories'],
        summary: 'Create an expense category',
        requestBody: json(createExpenseCategorySchema),
        responses: {
          '201': {
            description: 'Created',
            ...json(z.object({ newCategory: expenseCategorySchema })),
          },
          ...authErrors,
        },
      },
    },
    '/expenses-categories/{id}': {
      get: {
        tags: ['Expense categories'],
        summary: 'Get an expense category by id',
        requestParams: { path: idParam },
        responses: {
          '200': {
            description: 'Category',
            ...json(z.object({ category: expenseCategorySchema })),
          },
          ...authErrors,
          ...notFound,
        },
      },
      patch: {
        tags: ['Expense categories'],
        summary: 'Update an expense category',
        requestParams: { path: idParam },
        requestBody: json(updateExpenseCategorySchema),
        responses: {
          '200': {
            description: 'Updated',
            ...json(z.object({ category: expenseCategorySchema })),
          },
          ...authErrors,
          ...notFound,
        },
      },
      delete: {
        tags: ['Expense categories'],
        summary: 'Delete an expense category',
        requestParams: { path: idParam },
        responses: {
          '204': { description: 'Deleted' },
          ...authErrors,
          ...notFound,
        },
      },
    },
  },
});
