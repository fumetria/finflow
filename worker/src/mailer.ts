import nodemailer from 'nodemailer';
import { env } from './config/env.js';
import type { DueSoonEvent } from './kafka.js';

// Mailhog speaks plain SMTP with no auth/TLS.
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

export async function sendDueSoonEmail(event: DueSoonEvent) {
  const due = new Date(event.dueDate).toLocaleDateString('es-ES');
  await transport.sendMail({
    from: env.MAIL_FROM,
    to: event.userEmail,
    subject: `Pago próximo: ${event.concept} (${event.amount} ${event.currency})`,
    text:
      `Tienes un pago pendiente "${event.concept}" por ${event.amount} ${event.currency} ` +
      `en la cuenta "${event.accountName}", con vencimiento el ${due}.`,
  });
}
