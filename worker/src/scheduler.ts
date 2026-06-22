import cron from 'node-cron';
import { env } from './config/env.js';
import { scanDueSoon } from './scan.js';

export function startScheduler() {
  cron.schedule(env.DUE_SOON_CRON, () => {
    console.log('[scheduler] running due-soon scan');
    scanDueSoon().catch((err) => console.error('[scheduler] scan failed', err));
  });
  console.log(`[scheduler] scheduled due-soon scan (cron: ${env.DUE_SOON_CRON})`);
}
