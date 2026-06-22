/**
 * One-off due-soon scan: publishes a Kafka event for every pending expense
 * due within DUE_SOON_DAYS, then exits. The long-running worker handles this
 * daily via cron; this is the on-demand trigger for demos and local checks.
 *
 *   pnpm --filter @finflow/worker scan
 */
import { scanDueSoon } from './scan.js';
import { disconnectProducer } from './producer.js';
import { client } from './db.js';

async function main() {
  const n = await scanDueSoon();
  console.log(`[runScanOnce] done, published ${n} event(s)`);
  await disconnectProducer();
  await client.end({ timeout: 5 });
  process.exit(0);
}

main().catch((err) => {
  console.error('[runScanOnce] error', err);
  process.exit(1);
});
