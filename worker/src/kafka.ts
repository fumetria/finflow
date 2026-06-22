import { Kafka, logLevel } from 'kafkajs';
import { env, kafkaBrokers } from './config/env.js';

export const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers: kafkaBrokers,
  logLevel: logLevel.NOTHING,
});

/** Creates the due-soon topic if it doesn't exist yet (idempotent). */
export async function ensureTopics() {
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({
    topics: [{ topic: env.KAFKA_DUE_SOON_TOPIC, numPartitions: 1, replicationFactor: 1 }],
  });
  await admin.disconnect();
}

// Shape of the message we publish/consume on the due-soon topic.
export interface DueSoonEvent {
  expenseId: string;
  userId: string;
  userEmail: string;
  concept: string;
  amount: string;
  currency: string;
  dueDate: string; // ISO 8601
  accountName: string;
}
