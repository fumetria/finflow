import { eq, and } from 'drizzle-orm';
import { db, recurringRules } from '../../db/index.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { CreateRecurringRule, UpdateRecurringRule } from './recurringRules.schema.js';

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

export async function deleteRecurringRule(userId: string, id: string) {
  await findRecurringRulesById(userId, id);
  await db
    .delete(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)));
}
