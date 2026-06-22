import { eq } from 'drizzle-orm';
import { kafka, type DueSoonEvent } from './kafka.js';
import { env } from './config/env.js';
import { db, schema } from './db.js';
import { sendDueSoonEmail } from './mailer.js';
import { dueSoonConsumed, emailsSent, workerErrors } from './metrics.js';

const { expenses } = schema;
const consumer = kafka.consumer({ groupId: env.KAFKA_CONSUMER_GROUP });

export async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: env.KAFKA_DUE_SOON_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const event = JSON.parse(message.value.toString()) as DueSoonEvent;
      dueSoonConsumed.inc();

      try {
        // Send first, then mark notified. At-least-once: if we crash between the
        // two, the message is redelivered and we re-send (acceptable for a demo).
        await sendDueSoonEmail(event);
        emailsSent.inc();

        await db
          .update(expenses)
          .set({ dueSoonNotifiedAt: new Date() })
          .where(eq(expenses.id, event.expenseId));

        console.log(`[consumer] notified ${event.userEmail} about "${event.concept}"`);
      } catch (err) {
        workerErrors.inc();
        // Rethrow so KafkaJS retries (offset not committed) — at-least-once.
        throw err;
      }
    },
  });

  console.log('[consumer] running');
}

export async function stopConsumer() {
  await consumer.disconnect();
}
