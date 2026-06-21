import { eq, and } from 'drizzle-orm';
import { db, recurringRules, expenses } from '../../db/index.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { CreateRecurringRule, UpdateRecurringRule } from './recurringRules.schema.js';

// Generation horizon: how many months ahead from today the generate endpoint
// materializes expenses. No backfill — only occurrences from today onward.
const GENERATION_HORIZON_MONTHS = 3;

const MONTHS_PER_STEP: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  yearly: 12,
};

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Date-only key (ignoring time) to compare existing vs. computed occurrences.
function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type RecurringRuleRow = typeof recurringRules.$inferSelect;

// Compute the due dates a rule produces within [from, to] (both at midnight).
function computeDueDates(rule: RecurringRuleRow, from: Date, to: Date): Date[] {
  if (!rule.startDate) return [];
  const start = new Date(rule.startDate);
  const result: Date[] = [];

  if (rule.frequency === 'weekly') {
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cursor <= to) {
      if (cursor >= from) result.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return result;
  }

  const step = MONTHS_PER_STEP[rule.frequency];
  if (!step) return [];
  const day = rule.dayOfMonth ?? start.getDate();
  let year = start.getFullYear();
  let month = start.getMonth();

  while (true) {
    const occ = new Date(year, month, Math.min(day, lastDayOfMonth(year, month)));
    if (occ > to) break;
    if (occ >= from) result.push(occ);
    month += step;
    year += Math.floor(month / 12);
    month = month % 12;
  }
  return result;
}

export async function findAllRecurringRules(userId: string) {
  const userRecurringRules = await db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.userId, userId));
  return userRecurringRules;
}

export async function findRecurringRulesById(userId: string, id: string) {
  const [userRecurringRule] = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)));
  if (!userRecurringRule) {
    throw new AppError(
      'RECURRING_RULE_NOT_FOUND',
      'Not found any recurring rule with this id',
      404,
    );
  }
  return userRecurringRule;
}

export async function createRecurringRule(userId: string, data: CreateRecurringRule) {
  const formatedAmount = data.amount.toString();
  const [newRecurringRule] = await db
    .insert(recurringRules)
    .values({
      userId: userId,
      accountId: data.accountId,
      concept: data.concept,
      entityId: data.entityId,
      amount: formatedAmount,
      frequency: data.frequency,
      dayOfMonth: data.dayOfMonth,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      notes: data.notes,
    })
    .returning();
  return newRecurringRule;
}

export async function updateRecurringRule(userId: string, id: string, data: UpdateRecurringRule) {
  await findRecurringRulesById(userId, id);
  const setData = {
    ...(data.active !== undefined && { active: data.active }),
    ...(data.amount !== undefined && { amount: data.amount.toString() }),
    ...(data.concept !== undefined && { concept: data.concept }),
    ...(data.entityId !== undefined && { entityId: data.entityId }),
    ...(data.frequency !== undefined && { frequency: data.frequency }),
    ...(data.dayOfMonth !== undefined && { dayOfMonth: data.dayOfMonth }),
    ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
    ...(data.endDate !== undefined && {
      endDate: data.endDate ? new Date(data.endDate) : null,
    }),
    ...(data.notes !== undefined && { notes: data.notes }),
  };
  const [updatedRecurringRule] = await db
    .update(recurringRules)
    .set(setData)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
    .returning();
  return updatedRecurringRule;
}

export async function generateRecurringExpenses(userId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(now.getFullYear(), now.getMonth() + GENERATION_HORIZON_MONTHS, now.getDate());

  const rules = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.active, true)));

  let generated = 0;
  let skipped = 0;

  await db.transaction(async (tx) => {
    for (const rule of rules) {
      if (!rule.startDate || !rule.amount) continue;

      const ruleStart = new Date(rule.startDate);
      const from = ruleStart > today ? ruleStart : today;
      const ruleEnd = rule.endDate ? new Date(rule.endDate) : null;
      const to = ruleEnd && ruleEnd < horizon ? ruleEnd : horizon;
      if (from > to) continue;

      const dueDates = computeDueDates(rule, from, to);
      if (dueDates.length === 0) continue;

      const existing = await tx
        .select({ dueDate: expenses.dueDate })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.recurringRuleId, rule.id)));
      const existingKeys = new Set(existing.map((e) => dateKey(e.dueDate)));

      const toInsert = dueDates.filter((d) => !existingKeys.has(dateKey(d)));
      skipped += dueDates.length - toInsert.length;
      if (toInsert.length === 0) continue;

      await tx.insert(expenses).values(
        toInsert.map((dueDate) => ({
          userId,
          accountId: rule.accountId,
          entityId: rule.entityId,
          concept: rule.concept,
          amount: rule.amount as string,
          dueDate,
          recurringRuleId: rule.id,
        })),
      );
      generated += toInsert.length;
    }
  });

  return { generated, skipped };
}

export async function deleteRecurringRule(userId: string, id: string) {
  await findRecurringRulesById(userId, id);
  await db
    .delete(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)));
}
