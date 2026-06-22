import { Router } from 'express';
import authtenticate from '../../middlewares/authtenticate.js';
import { createLoan, findAllLoans, findLoanById } from './loans.service.js';
import { createLoanSchema } from './loans.schema.js';

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

router.get('/:id', async (req, res, next) => {
  try {
    const selectedLoan = await findLoanById(req.user.sub, req.params.id);
    return res.status(200).json(selectedLoan);
  } catch (error) {
    next(error);
  }
});

export default router;
