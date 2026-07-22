// Demo data seeder for the Express API.
//
// Wipes any previous demo user (cascades to every owned row) and recreates a
// full picture: accounts, categories, entities, one-off expenses (paid and
// pending), recurring rules (rent/subscription/gym) and a couple of loans —
// then reuses the real services to generate/materialize expenses so the
// dataset ends up exactly as if a user had operated the app for months.
//
// One pending expense is deliberately due in ~2 days so the worker's due-soon
// scan (DUE_SOON_DAYS, default 3) picks it up and a test email lands in Mailhog
// (http://localhost:8025).
//
// It also creates a second plain user (the "admin" login), with no data of its
// own. Credentials for both come from the root .env (SEED_DEMO_* / SEED_ADMIN_*).
//
// Run with: pnpm --filter @finflow/api db:seed
// Env vars are loaded transitively: db/index.js -> config/env.js runs
// dotenv on the root .env at import time, so no --env-file is needed here.

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db, users, accounts, entities, expensesCategories, expenses } from './index.js';
import {
  createRecurringRule,
  generateRecurringExpenses,
} from '../routes/recurring_rules/recurringRules.service.js';
import { createLoan, materializeLoanInstallments } from '../routes/loans/loans.service.js';
import { markAsPaid } from '../routes/expenses/expenses.service.js';

const DEMO_EMAIL = env.SEED_DEMO_EMAIL;
const DEMO_PASSWORD = env.SEED_DEMO_PASSWORD;
const ADMIN_EMAIL = env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = env.SEED_ADMIN_PASSWORD;

// Recreates a user from scratch: deleting cascades to every row it owns, so the
// seed is idempotent no matter how many times it runs.
async function recreateUser(email: string, password: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    console.log(`Removing previous user ${email} (cascades to all owned data)...`);
    await db.delete(users).where(eq(users.id, existing.id));
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Seeded users skip the email verification flow — they must be able to log in
  // right away.
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash, emailVerifiedAt: new Date() })
    .returning();
  if (!created) throw new Error(`Failed to create user ${email}`);
  console.log(`Created user ${email}`);
  return created;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function monthsAgo(n: number, day = 1) {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, day));
}

async function main() {
  const demoUser = await recreateUser(DEMO_EMAIL, DEMO_PASSWORD);
  const userId = demoUser.id;

  // Extra login for the demo. No admin role and no data of its own yet — it is
  // just a second set of credentials.
  await recreateUser(ADMIN_EMAIL, ADMIN_PASSWORD);

  // ── Accounts ─────────────────────────────────────────────────────────────
  const [checking, savings, cash] = await db
    .insert(accounts)
    .values([
      {
        userId,
        name: 'Cuenta Corriente',
        type: 'bank',
        currentBalance: '6500.00',
        currency: 'EUR',
      },
      { userId, name: 'Cuenta Ahorro', type: 'bank', currentBalance: '10000.00', currency: 'EUR' },
      { userId, name: 'Efectivo', type: 'cash', currentBalance: '120.00', currency: 'EUR' },
    ])
    .returning();
  if (!checking || !savings || !cash) throw new Error('Failed to create accounts');

  // ── Entities ─────────────────────────────────────────────────────────────
  const [landlord, netflix, iberdrola, vodafone, mercadona, bank] = await db
    .insert(entities)
    .values([
      { userId, name: 'Inmobiliaria Alameda', category: 'Landlord' },
      { userId, name: 'Netflix', category: 'Subscription' },
      { userId, name: 'Iberdrola', category: 'Utility' },
      { userId, name: 'Vodafone España', category: 'Utility' },
      { userId, name: 'Mercadona', category: 'Retail' },
      { userId, name: 'Banco Santander', category: 'Lender' },
    ])
    .returning();
  if (!landlord || !netflix || !iberdrola || !vodafone || !mercadona || !bank) {
    throw new Error('Failed to create entities');
  }

  // ── Expense categories ───────────────────────────────────────────────────
  const [catHousing, catSubs, catUtilities, catGroceries, catTransport, catLeisure] = await db
    .insert(expensesCategories)
    .values([
      { userId, name: 'Vivienda' },
      { userId, name: 'Suscripciones' },
      { userId, name: 'Suministros' },
      { userId, name: 'Alimentación' },
      { userId, name: 'Transporte' },
      { userId, name: 'Ocio' },
    ])
    .returning();
  if (!catHousing || !catSubs || !catUtilities || !catGroceries || !catTransport || !catLeisure) {
    throw new Error('Failed to create categories');
  }

  // ── One-off expenses: paid history ──────────────────────────────────────
  const paidHistory: Array<{
    accountId: string;
    entityId?: string | null;
    categoryId?: string | null;
    concept: string;
    amount: number;
    dueDate: Date;
  }> = [
    {
      accountId: checking.id,
      entityId: mercadona.id,
      categoryId: catGroceries.id,
      concept: 'Compra semanal',
      amount: 82.4,
      dueDate: daysAgo(56),
    },
    {
      accountId: checking.id,
      entityId: mercadona.id,
      categoryId: catGroceries.id,
      concept: 'Compra semanal',
      amount: 76.1,
      dueDate: daysAgo(42),
    },
    {
      accountId: checking.id,
      entityId: mercadona.id,
      categoryId: catGroceries.id,
      concept: 'Compra semanal',
      amount: 91.3,
      dueDate: daysAgo(35),
    },
    {
      accountId: checking.id,
      categoryId: catTransport.id,
      concept: 'Gasolina Repsol',
      amount: 55.0,
      dueDate: daysAgo(28),
    },
    {
      accountId: checking.id,
      entityId: mercadona.id,
      categoryId: catGroceries.id,
      concept: 'Compra semanal',
      amount: 88.75,
      dueDate: daysAgo(21),
    },
    {
      accountId: cash.id,
      categoryId: catLeisure.id,
      concept: 'Cine y cena',
      amount: 45.0,
      dueDate: daysAgo(20),
    },
    {
      accountId: checking.id,
      categoryId: catTransport.id,
      concept: 'Gasolina Repsol',
      amount: 58.2,
      dueDate: daysAgo(14),
    },
    {
      accountId: checking.id,
      entityId: mercadona.id,
      categoryId: catGroceries.id,
      concept: 'Compra semanal',
      amount: 79.9,
      dueDate: daysAgo(7),
    },
    {
      accountId: checking.id,
      entityId: iberdrola.id,
      categoryId: catUtilities.id,
      concept: 'Factura luz junio',
      amount: 64.3,
      dueDate: daysAgo(2),
    },
  ];

  for (const item of paidHistory) {
    const [expense] = await db
      .insert(expenses)
      .values({
        userId,
        accountId: item.accountId,
        entityId: item.entityId ?? null,
        categoryId: item.categoryId ?? null,
        concept: item.concept,
        amount: item.amount.toString(),
        dueDate: item.dueDate,
      })
      .returning();
    if (expense) {
      await markAsPaid(userId, expense.id, { paidAt: item.dueDate.toISOString() });
    }
  }

  // ── One-off expenses: still pending ─────────────────────────────────────
  // The first one is due in ~2 days: it falls inside the worker's due-soon
  // window (DUE_SOON_DAYS=3) so a scan reliably fires a test email to Mailhog.
  const pendingUpcoming = [
    {
      accountId: checking.id,
      entityId: vodafone.id,
      categoryId: catUtilities.id,
      concept: 'Factura móvil',
      amount: 32.9,
      dueDate: daysAgo(-2),
    },
    {
      accountId: checking.id,
      entityId: vodafone.id,
      categoryId: catUtilities.id,
      concept: 'Factura móvil',
      amount: 32.9,
      dueDate: daysAgo(-8),
    },
    {
      accountId: checking.id,
      categoryId: catTransport.id,
      concept: 'Revisión coche',
      amount: 120.0,
      dueDate: daysAgo(-15),
    },
    {
      accountId: checking.id,
      entityId: iberdrola.id,
      categoryId: catUtilities.id,
      concept: 'Factura luz julio',
      amount: 58.1,
      dueDate: daysAgo(-26),
    },
    {
      accountId: checking.id,
      categoryId: catHousing.id,
      concept: 'Seguro hogar',
      amount: 210.0,
      dueDate: daysAgo(-31),
    },
  ];

  for (const item of pendingUpcoming) {
    await db.insert(expenses).values({
      userId,
      accountId: item.accountId,
      entityId: item.entityId ?? null,
      categoryId: item.categoryId,
      concept: item.concept,
      amount: item.amount.toString(),
      dueDate: item.dueDate,
    });
  }

  // ── Recurring rules ──────────────────────────────────────────────────────
  await createRecurringRule(userId, {
    accountId: checking.id,
    entityId: landlord.id,
    categoryId: catHousing.id,
    concept: 'Alquiler piso',
    amount: 750,
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: monthsAgo(10, 1).toISOString(),
  });

  await createRecurringRule(userId, {
    accountId: checking.id,
    entityId: netflix.id,
    categoryId: catSubs.id,
    concept: 'Netflix',
    amount: 15.99,
    frequency: 'monthly',
    dayOfMonth: 5,
    startDate: monthsAgo(9, 5).toISOString(),
  });

  await createRecurringRule(userId, {
    accountId: checking.id,
    categoryId: catLeisure.id,
    concept: 'Gimnasio',
    amount: 34.9,
    frequency: 'monthly',
    dayOfMonth: 3,
    startDate: monthsAgo(6, 3).toISOString(),
  });

  const { generated } = await generateRecurringExpenses(userId);
  console.log(`Generated ${generated} expenses from recurring rules`);

  // ── Loans ────────────────────────────────────────────────────────────────
  await createLoan(userId, {
    accountId: checking.id,
    entityId: bank.id,
    concept: 'Préstamo coche',
    principal: 12000,
    annualRate: 6.5,
    termMonths: 48,
    startDate: monthsAgo(11, 1).toISOString(),
  });

  await createLoan(userId, {
    accountId: checking.id,
    entityId: bank.id,
    concept: 'Reforma cocina',
    principal: 5000,
    annualRate: 4.75,
    termMonths: 24,
    startDate: monthsAgo(5, 15).toISOString(),
  });

  const { materialized } = await materializeLoanInstallments(userId);
  console.log(`Materialized ${materialized} loan installments as expenses`);

  // Mark overdue loan installment expenses (due before today) as paid, so
  // the demo shows a loan already in progress rather than freshly created.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const overdue = await db
    .select({ id: expenses.id, dueDate: expenses.dueDate })
    .from(expenses)
    .where(eq(expenses.userId, userId));
  for (const row of overdue) {
    if (row.dueDate < today) {
      // Skip expenses already marked paid (the one-off history above).
      const [current] = await db.select().from(expenses).where(eq(expenses.id, row.id));
      if (current && current.status === 'pending') {
        await markAsPaid(userId, row.id, { paidAt: row.dueDate.toISOString() });
      }
    }
  }

  console.log('Demo seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
