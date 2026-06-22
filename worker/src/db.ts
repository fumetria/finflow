import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@finflow/api/schema';
import { env } from './config/env.js';

// Reuses the api's Drizzle schema (single source of truth) but opens its own
// connection so the worker never imports the api's runtime/env wiring.
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

export { schema };
export { client };
