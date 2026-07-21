import nodemailer from 'nodemailer';
import { env } from './config/env.js';
import type { DueSoonEvent } from './kafka.js';
import { buildDueSoonEmail } from '@finflow/api/emails';

// With credentials we authenticate against a real provider (e.g. IONOS);
// without them we fall back to Mailhog's plain, unauthenticated SMTP.
const useAuth = Boolean(env.SMTP_USER && env.SMTP_PASS);
const secure = env.SMTP_SECURE ?? env.SMTP_PORT === 465;

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure,
  ...(useAuth
    ? {
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        // Port 587 starts plaintext and upgrades via STARTTLS — require it.
        requireTLS: !secure,
      }
    : {}),
});

console.log(
  `[mailer] SMTP ${env.SMTP_HOST}:${env.SMTP_PORT} ` +
    `(${useAuth ? 'authenticated' : 'no-auth'}, ${secure ? 'TLS' : 'STARTTLS/plain'})`,
);

export async function sendDueSoonEmail(event: DueSoonEvent) {
  await transport.sendMail({
    from: env.MAIL_FROM,
    to: event.userEmail,
    ...buildDueSoonEmail(event),
  });
}
