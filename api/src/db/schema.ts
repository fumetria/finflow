import { pgTable, uuid, varchar, text, timestamp, numeric, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { timestamps } from './column-helpers.js';

// ── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['admin', 'user']);
export const accountTypeEnum = pgEnum('account_type', ['bank', 'cash']);
export const expenseStatusEnum = pgEnum('expenses_status', ['pending', 'paid']);

// ── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: roleEnum('role').notNull().default('user'),
    ...timestamps
})

// Accounts

export const accounts = pgTable('accounts', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    type: accountTypeEnum('type').notNull().default('bank'),
    currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).notNull().default('0'),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    ...timestamps
})

// Entities

export const entities = pgTable('entities', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    category: varchar('category', { length: 100 }),
    ...timestamps
})

// Expenses

export const expenses = pgTable('expenses', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    entityId: uuid('entity_id').references(() => entities.id, { onDelete: 'set null' }),
    concept: varchar('concept', { length: 255 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    dueDate: timestamp('due_date').notNull(),
    status: expenseStatusEnum('status').notNull().default('pending'),
    paidAt: timestamp('paid_at'),
    notes: text('notes'),
    recurringRuleId: uuid('recurring_rule_id'),
    ...timestamps
})