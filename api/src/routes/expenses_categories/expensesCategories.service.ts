import { expensesCategories, db } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../../middlewares/errorHandler.js';
import type {
  createExpenseCategory,
  updateExpenseCategory,
} from './expensesCategories.schemas.js';

export async function findAllExpenseCategories(userId: string) {
  const categories = await db
    .select()
    .from(expensesCategories)
    .where(eq(expensesCategories.userId, userId));
  return categories;
}

export async function findExpenseCategoryById(userId: string, id: string) {
  const [category] = await db
    .select()
    .from(expensesCategories)
    .where(and(eq(expensesCategories.userId, userId), eq(expensesCategories.id, id)));
  if (!category) {
    throw new AppError('NOT_FOUND', 'Not found any category with this id', 404);
  }
  return category;
}

export async function createExpenseCategory(userId: string, data: createExpenseCategory) {
  const existsCategory = await db
    .select()
    .from(expensesCategories)
    .where(and(eq(expensesCategories.userId, userId), eq(expensesCategories.name, data.name)));
  if (existsCategory.length > 0) {
    throw new AppError('CAT_EXISTS', 'This category is already created', 409);
  }
  const newCategory = await db
    .insert(expensesCategories)
    .values({
      userId: userId,
      name: data.name,
    })
    .returning();
  return newCategory;
}

export async function updateExpenseCategory(
  userId: string,
  id: string,
  data: updateExpenseCategory,
) {
  await findExpenseCategoryById(userId, id);
  const updatedCategory = await db
    .update(expensesCategories)
    .set({
      name: data.name,
    })
    .where(and(eq(expensesCategories.userId, userId), eq(expensesCategories.id, id)))
    .returning();
  return updatedCategory;
}

export async function deleteExpenseCategory(userId: string, id: string) {
  await findExpenseCategoryById(userId, id);
  await db
    .delete(expensesCategories)
    .where(and(eq(expensesCategories.userId, userId), eq(expensesCategories.id, id)));
}
