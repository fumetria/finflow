import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  pgEnum,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { timestamps } from './column-helpers.js';

// ── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['admin', 'user']);
export const accountTypeEnum = pgEnum('account_type', ['bank', 'cash']);
export const expenseStatusEnum = pgEnum('expenses_status', ['pending', 'paid']);
export const frecuencyEnum = pgEnum('frecuency', [
  'monthly',
  'quarterly',
  'yearly',
  'weekly',
  'biannual',
]);
export const loanStatusEnum = pgEnum('loan_status', ['active', 'paid', 'cancelled']);
export const loanInstallmentStatusEnum = pgEnum('loan_installment_status', ['pending', 'paid']);

// ── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('user'),
  // Null until the user clicks the link sent on registration. Login is refused
  // while it stays null.
  emailVerifiedAt: timestamp('email_verified_at'),
  ...timestamps,
});

// One row per verification link sent. The token itself never touches the DB —
// only its sha256 hex digest — so a dump of this table cannot be replayed.
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  ...timestamps,
});

// Accounts

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: accountTypeEnum('type').notNull().default('bank'),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  ...timestamps,
});

// Entities

export const entities = pgTable('entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 100 }),
  ...timestamps,
});

// Expenses categories

export const expensesCategories = pgTable('expenses_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar().notNull(),
  ...timestamps,
});

// Expenses

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  entityId: uuid('entity_id').references(() => entities.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => expensesCategories.id, { onDelete: 'set null' }),
  concept: varchar('concept', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: expenseStatusEnum('status').notNull().default('pending'),
  paidAt: timestamp('paid_at'),
  dueSoonNotifiedAt: timestamp('due_soon_notified_at'),
  notes: text('notes'),
  recurringRuleId: uuid('recurring_rule_id').references(() => recurringRules.id, {
    onDelete: 'set null',
  }),
  ...timestamps,
});

// Recurring

export const recurringRules = pgTable('recurring_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  concept: varchar('concept', { length: 255 }).notNull(),
  entityId: uuid('entity_id').references(() => entities.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => expensesCategories.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }),
  frequency: frecuencyEnum('frecuency').notNull(),
  dayOfMonth: integer(),
  startDate: timestamp(),
  endDate: timestamp(),
  active: boolean().default(true),
  notes: text(),
  ...timestamps,
});

// Loans

export const loans = pgTable('loans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  entityId: uuid('entity_id').references(() => entities.id, { onDelete: 'set null' }),
  concept: varchar('concept', { length: 255 }).notNull(),
  principal: numeric('principal', { precision: 12, scale: 2 }).notNull(),
  annualRate: numeric('annual_rate', { precision: 7, scale: 4 }).notNull(),
  termMonths: integer('term_months').notNull(),
  startDate: timestamp('start_date').notNull(),
  status: loanStatusEnum('status').notNull().default('active'),
  notes: text('notes'),
  ...timestamps,
});

// Loan installments (amortization schedule)

export const loanInstallments = pgTable('loan_installments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  loanId: uuid('loan_id')
    .notNull()
    .references(() => loans.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  dueDate: timestamp('due_date').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  principalComponent: numeric('principal_component', { precision: 12, scale: 2 }).notNull(),
  interestComponent: numeric('interest_component', { precision: 12, scale: 2 }).notNull(),
  remainingBalance: numeric('remaining_balance', { precision: 12, scale: 2 }).notNull(),
  status: loanInstallmentStatusEnum('status').notNull().default('pending'),
  expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'set null' }),
  ...timestamps,
});
