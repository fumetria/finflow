import { sql } from 'drizzle-orm';
import { env, kafkaBrokers } from './config/env.js';
import { db, client } from './db.js';
import { ensureTopics } from './kafka.js';
import { connectProducer, disconnectProducer } from './producer.js';
import { startConsumer, stopConsumer } from './consumer.js';
import { startScheduler } from './scheduler.js';
import { scanDueSoon } from './scan.js';
import { startMetricsServer } from './metrics.js';

async function main() {
  console.log('[worker] starting…');
  console.log('[worker] config', {
    env: env.NODE_ENV,
    brokers: kafkaBrokers,
    topic: env.KAFKA_DUE_SOON_TOPIC,
    dueSoonDays: env.DUE_SOON_DAYS,
    cron: env.DUE_SOON_CRON,
    metricsPort: env.WORKER_METRICS_PORT,
    smtp: `${env.SMTP_HOST}:${env.SMTP_PORT}`,
    runScanOnBoot: env.RUN_SCAN_ON_BOOT,
  });

  await db.execute(sql`SELECT 1`);
  console.log('[worker] database connection OK');

  await ensureTopics();
  console.log(`[worker] topic ready: ${env.KAFKA_DUE_SOON_TOPIC}`);

  await connectProducer();
  console.log('[worker] kafka producer connected');

  await startConsumer();
  startScheduler();
  startMetricsServer();

  if (env.RUN_SCAN_ON_BOOT) {
    console.log('[worker] RUN_SCAN_ON_BOOT enabled — scanning now');
    await scanDueSoon();
  }

  console.log('[worker] ready');
}

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down…`);
  try {
    await stopConsumer();
    await disconnectProducer();
    await client.end({ timeout: 5 });
  } catch (err) {
    console.error('[worker] error during shutdown', err);
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

main().catch((err) => {
  console.error('[worker] fatal error during startup', err);
  process.exit(1);
});
