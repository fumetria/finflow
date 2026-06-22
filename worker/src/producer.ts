import { kafka, type DueSoonEvent } from './kafka.js';
import { env } from './config/env.js';
import { dueSoonProduced } from './metrics.js';

const producer = kafka.producer();
let connected = false;

export async function connectProducer() {
  if (connected) return;
  await producer.connect();
  connected = true;
}

export async function disconnectProducer() {
  if (!connected) return;
  await producer.disconnect();
  connected = false;
}

export async function publishDueSoon(event: DueSoonEvent) {
  await producer.send({
    topic: env.KAFKA_DUE_SOON_TOPIC,
    // Key by expenseId so events for the same expense land in the same partition.
    messages: [{ key: event.expenseId, value: JSON.stringify(event) }],
  });
  dueSoonProduced.inc();
}
