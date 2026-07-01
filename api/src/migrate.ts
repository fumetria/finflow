import { config } from 'dotenv';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Local runs read the root .env; inside Docker the vars come from the container
// environment (this file is intentionally standalone — it does not import the
// api's env.ts so it never requires JWT_SECRET etc. just to migrate).
config({ path: resolve(process.cwd(), '../.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required to run migrations');
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('[migrate] applying migrations…');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('[migrate] done');
  await sql.end();
}

main().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
