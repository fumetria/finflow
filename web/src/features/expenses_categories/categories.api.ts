import { api } from '@/lib/api';

export type Category = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
};

export type CategoryInput = {
  name: string;
};

// GET /expenses-categories — all categories for the authenticated user.
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<{ categories: Category[] }>('/expenses-categories');
  return data.categories;
}

// POST /expenses-categories — create a new category.
export async function createCategory(input: CategoryInput): Promise<void> {
  await api.post('/expenses-categories', input);
}

// PATCH /expenses-categories/:id — rename an existing category.
export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  await api.patch(`/expenses-categories/${id}`, input);
}

// DELETE /expenses-categories/:id — delete a category. Linked expenses keep
// their row but their category_id is set to null (FK onDelete: set null).
export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/expenses-categories/${id}`);
}
