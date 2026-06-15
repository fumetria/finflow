import { Router } from 'express';
import authtenticate from '../../middlewares/authtenticate.js';
import {
    findAllExpenses,
    findExpensesById,
    createExpense,
    updateExpense,
    markAsPaid,
} from './expenses.service.js';
import { createExpenseSchema, updateExpenseSchema, markAsPaidSchema } from './expenses.schemas.js';

const router = Router();

router.use(authtenticate);

router.get('/', async (req, res, next) => {
    try {
        const userExpenses = await findAllExpenses(req.user.sub);
        return res.status(200).json({ userExpenses });
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const body = createExpenseSchema.parse(req.body);
        const newExpense = await createExpense(req.user.sub, body);
        return res.status(201).json({ newExpense });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const selectedExpense = await findExpensesById(req.user.sub, req.params.id);
        return res.status(200).json({ selectedExpense });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const body = updateExpenseSchema.parse(req.body);
        const updatedExpense = await updateExpense(req.user.sub, req.params.id, body);
        return res.status(200).json({ updatedExpense });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/paid', async (req, res, next) => {
    try {
        const body = markAsPaidSchema.parse(req.body);
        const paidExpense = await markAsPaid(req.user.sub, req.params.id, body);
        return res.status(200).json({ paidExpense });
    } catch (error) {
        next(error);
    }
})

export default router;
