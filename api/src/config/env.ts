import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('1d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Credentials used by the demo seeder (db:seed). Only read there.
  SEED_DEMO_EMAIL: z.string().email().default('demo@finflow.app'),
  SEED_DEMO_PASSWORD: z.string().min(8).default('Demo1234!'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@finflow.app'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin1234!'),

  // SMTP — defaults target Mailhog (no auth/TLS). Set SMTP_USER + SMTP_PASS
  // to talk to a real provider (e.g. IONOS); auth + TLS turn on automatically.
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Override TLS explicitly; when unset we infer it from the port (465 = SSL).
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v.toLowerCase() === 'true')),
  MAIL_FROM: z.string().default('finflow@example.com'),

  // How long a registration verification link stays valid.
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
});

export const env = schema.parse(process.env);
