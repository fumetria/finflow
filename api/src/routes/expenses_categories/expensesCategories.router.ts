import { Router } from 'express';
import authtenticate from '../../middlewares/authtenticate.js';
import {
  findAllExpenseCategories,
  findExpenseCategoryById,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from './expensesCategories.service.js';
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
} from './expensesCategories.schemas.js';

const router = Router();

router.use(authtenticate);

router.get('/', async (req, res, next) => {
  try {
    const categories = await findAllExpenseCategories(req.user.sub);
    return res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const category = await findExpenseCategoryById(req.user.sub, req.params.id);
    return res.status(200).json({ category });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = createExpenseCategorySchema.parse(req.body);
    const newCategory = await createExpenseCategory(req.user.sub, body);
    return res.status(201).json({ newCategory });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = updateExpenseCategorySchema.parse(req.body);
    const [category] = await updateExpenseCategory(req.user.sub, req.params.id, body);
    return res.status(200).json({ category });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteExpenseCategory(req.user.sub, req.params.id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
