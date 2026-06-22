import http from 'node:http';
import { Registry, collectDefaultMetrics, Counter } from 'prom-client';
import { env } from './config/env.js';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const dueSoonProduced = new Counter({
  name: 'worker_due_soon_events_produced_total',
  help: 'Due-soon events published to Kafka',
  registers: [registry],
});

export const dueSoonConsumed = new Counter({
  name: 'worker_due_soon_events_consumed_total',
  help: 'Due-soon events consumed from Kafka',
  registers: [registry],
});

export const emailsSent = new Counter({
  name: 'worker_emails_sent_total',
  help: 'Due-soon notification emails sent',
  registers: [registry],
});

export const workerErrors = new Counter({
  name: 'worker_errors_total',
  help: 'Errors while processing due-soon events',
  registers: [registry],
});

export function startMetricsServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/metrics') {
      registry
        .metrics()
        .then((body) => {
          res.setHeader('Content-Type', registry.contentType);
          res.end(body);
        })
        .catch(() => {
          res.statusCode = 500;
          res.end();
        });
    } else if (req.url === '/health') {
      res.end('ok');
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  server.listen(env.WORKER_METRICS_PORT, () => {
    console.log(`[worker] metrics on :${env.WORKER_METRICS_PORT}/metrics`);
  });
  return server;
}
