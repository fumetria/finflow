import { Router } from 'express';
import authtenticate from '../../middlewares/authtenticate.js';
import { getForecast } from './forecast.service.js';
import { forecastQuerySchema } from './forecast.schema.js';

const router = Router();

router.use(authtenticate);

router.get('/', async (req, res, next) => {
  try {
    const { date } = forecastQuerySchema.parse(req.query);
    const forecast = await getForecast(req.user.sub, date);
    return res.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
});

export default router;
