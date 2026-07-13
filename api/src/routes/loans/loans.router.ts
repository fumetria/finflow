import { Router } from 'express';
import authtenticate from '../../middlewares/authtenticate.js';
import {
  createLoan,
  findAllLoans,
  findLoanById,
  materializeLoanInstallments,
  updateLoanAccount,
  reviseLoan,
  deleteLoan,
} from './loans.service.js';
import { createLoanSchema, updateLoanAccountSchema, reviseLoanSchema } from './loans.schema.js';

const router = Router();

router.use(authtenticate);

router.get('/', async (req, res, next) => {
  try {
    const userLoans = await findAllLoans(req.user.sub);
    return res.status(200).json({ userLoans });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = createLoanSchema.parse(req.body);
    const newLoan = await createLoan(req.user.sub, body);
    return res.status(201).json(newLoan);
  } catch (error) {
    next(error);
  }
});

router.post('/materialize', async (req, res, next) => {
  try {
    const result = await materializeLoanInstallments(req.user.sub);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const selectedLoan = await findLoanById(req.user.sub, req.params.id);
    return res.status(200).json(selectedLoan);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = updateLoanAccountSchema.parse(req.body);
    const loan = await updateLoanAccount(req.user.sub, req.params.id, body.accountId);
    return res.status(200).json({ loan });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const body = reviseLoanSchema.parse(req.body);
    const result = await reviseLoan(req.user.sub, req.params.id, body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteLoan(req.user.sub, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
