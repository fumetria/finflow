import express from 'express';
import { env } from './config/env.js';
import { db } from './db/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { sql } from 'drizzle-orm';
import authRouter from './routes/auth/auth.router.js';
import accountsRouter from './routes/accounts/accounts.router.js';
import expenseRouter from './routes/expenses/expenses.router.js';
import recurringRulesRouter from './routes/recurring_rules/recurringRules.router.js';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/expenses', expenseRouter);
app.use('/api/v1/recurring-rules', recurringRulesRouter);

app.get('/health', async (_req, res) => {
  await db.execute(sql`SELECT 1`);
  res.json({ status: 'ok', db: 'connected' });
});

app.use(errorHandler);

app.listen(env.API_PORT, () => {
  console.log(`API running on port ${env.API_PORT}`);
});
