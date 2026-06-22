import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),

  // Kafka
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('finflow-worker'),
  KAFKA_DUE_SOON_TOPIC: z.string().default('expense.due_soon'),
  KAFKA_CONSUMER_GROUP: z.string().default('finflow-due-soon'),

  // Due-soon scan
  DUE_SOON_DAYS: z.coerce.number().int().positive().default(3),
  DUE_SOON_CRON: z.string().default('0 8 * * *'),
  // Run a scan once shortly after boot (handy for demos; cron handles the daily run).
  RUN_SCAN_ON_BOOT: z
    .string()
    .default('false')
    .transform((v) => v.toLowerCase() === 'true'),

  // Metrics
  WORKER_METRICS_PORT: z.coerce.number().default(9100),

  // Mailhog / SMTP
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  MAIL_FROM: z.string().default('finflow@example.com'),
});

export const env = schema.parse(process.env);

// KafkaJS expects an array of brokers.
export const kafkaBrokers = env.KAFKA_BROKERS.split(',').map((b) => b.trim());
