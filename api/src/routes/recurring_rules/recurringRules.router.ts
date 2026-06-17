import { Router } from 'express';
import authtenticate from '../../middlewares/authtenticate.js';
import {
  findAllRecurringRules,
  findRecurringRulesById,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
} from './recurringRules.service.js';
import {
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
} from './recurringRules.schema.js';

const router = Router();

router.use(authtenticate);

router.get('/', async (req, res, next) => {
  try {
    const userRecurringRules = await findAllRecurringRules(req.user.sub);
    return res.status(200).json({ userRecurringRules });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = createRecurringRuleSchema.parse(req.body);
    const newRecurringRule = await createRecurringRule(req.user.sub, body);
    return res.status(201).json({ newRecurringRule });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const selectedRecurringRule = await findRecurringRulesById(req.user.sub, req.params.id);
    return res.status(200).json({ selectedRecurringRule });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = updateRecurringRuleSchema.parse(req.body);
    const updatedRecurringRule = await updateRecurringRule(req.user.sub, req.params.id, body);
    return res.status(200).json({ updatedRecurringRule });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteRecurringRule(req.user.sub, req.params.id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
