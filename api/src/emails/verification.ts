import {
  INK,
  LOGO_ATTACHMENT,
  MUTED,
  button,
  escapeHtml,
  renderLayout,
  type BuiltEmail,
} from './layout.js';

/**
 * Builds the account verification email. `verifyUrl` points at the frontend's
 * /verify-email screen and carries the one-time token; `ttlHours` is how long
 * that link stays valid.
 */
export function buildVerificationEmail(verifyUrl: string, ttlHours: number): BuiltEmail {
  const subject = 'Confirma tu cuenta de finflow';

  const text =
    `Bienvenido a finflow.\n\n` +
    `Confirma tu dirección de correo abriendo este enlace:\n${verifyUrl}\n\n` +
    `El enlace caduca en ${ttlHours} horas y solo puede usarse una vez.\n` +
    `Si no has creado ninguna cuenta, ignora este mensaje.`;

  const html = renderLayout({
    eyebrow: 'Confirma tu cuenta',
    title: 'Bienvenido a finflow',
    bodyHtml: `<p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${INK};">Solo queda un paso: confirma que esta dirección de correo es tuya para poder acceder a tu cuenta.</p>
              ${button('Confirmar mi correo', verifyUrl)}
              <p style="margin:24px 0 4px 0;font-size:13px;color:${MUTED};">Si el botón no funciona, copia y pega esta dirección en tu navegador:</p>
              <p style="margin:0 0 24px 0;font-size:13px;word-break:break-all;"><a href="${verifyUrl}" style="color:${INK};">${escapeHtml(verifyUrl)}</a></p>
              <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;color:${MUTED};">El enlace caduca en ${ttlHours} horas y solo puede usarse una vez. Si no has creado ninguna cuenta, ignora este mensaje.</p>`,
  });

  return { subject, text, html, attachments: [LOGO_ATTACHMENT] };
}
