import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';

import * as schema from './schema.js';
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

export * from './schema.js';
