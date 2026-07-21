import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

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

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const hours = env.EMAIL_VERIFICATION_TTL_HOURS;
  await transport.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: 'Confirma tu cuenta de finflow',
    text:
      `Bienvenido a finflow.\n\n` +
      `Confirma tu dirección de correo abriendo este enlace:\n${verifyUrl}\n\n` +
      `El enlace caduca en ${hours} horas y solo puede usarse una vez.\n` +
      `Si no has creado ninguna cuenta, ignora este mensaje.`,
  });
}
