import type { DueSoonEvent } from './kafka.js';

// Brand tokens copied from the frontend (web/src/index.css). The worker doesn't
// share the web CSS, so the hex values live here as constants.
const BRAND = '#0d9488'; // teal, --brand
const BRAND_DARK = '#0f766e'; // slightly darker teal for the glyph border
const INK = '#18181b'; // near-black text, --foreground
const MUTED = '#71717a'; // --muted-foreground
const BORDER = '#e4e4e7'; // --border
const PAGE_BG = '#f4f4f5'; // neutral page background
const CARD_BG = '#ffffff';

/** Escapes user-provided values before interpolating them into the HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Builds the due-soon email: subject + plain-text fallback + branded HTML. */
export function buildDueSoonEmail(event: DueSoonEvent): {
  subject: string;
  text: string;
  html: string;
} {
  const due = new Date(event.dueDate).toLocaleDateString('es-ES');
  const money = `${event.amount} ${event.currency}`;

  const subject = `Pago próximo: ${event.concept} (${money})`;

  const text =
    `Tienes un pago pendiente "${event.concept}" por ${money} ` +
    `en la cuenta "${event.accountName}", con vencimiento el ${due}.`;

  // Escaped copies for HTML interpolation.
  const concept = escapeHtml(event.concept);
  const accountName = escapeHtml(event.accountName);
  const amount = escapeHtml(money);
  const dueSafe = escapeHtml(due);

  const detailRow = (label: string, value: string, last = false) => `
              <tr>
                <td style="padding:12px 0;${last ? '' : `border-bottom:1px solid ${BORDER};`}font-size:14px;color:${MUTED};">${label}</td>
                <td style="padding:12px 0;${last ? '' : `border-bottom:1px solid ${BORDER};`}font-size:14px;color:${INK};font-weight:600;text-align:right;">${value}</td>
              </tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background-color:${CARD_BG};border-radius:12px;overflow:hidden;border:1px solid ${BORDER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND};padding:20px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:30px;height:30px;background-color:#ffffff;border-radius:8px;">
                      <tr>
                        <td align="center" style="font-size:17px;line-height:30px;font-weight:800;color:${BRAND_DARK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">&#8599;</td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align:middle;padding-left:12px;font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">finflow</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:${BRAND};">Pago próximo</p>
              <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:700;color:${INK};">Tienes un pago próximo a vencer</h1>
              <p style="margin:0;font-size:13px;color:${MUTED};">Importe</p>
              <p style="margin:2px 0 24px 0;font-size:32px;font-weight:800;letter-spacing:-0.02em;color:${BRAND};">${amount}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRow('Concepto', concept)}${detailRow('Cuenta', accountName)}${detailRow('Vencimiento', dueSafe, true)}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px 28px 28px;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:${INK};">finflow · control de tus finanzas personales</p>
              <p style="margin:0;font-size:12px;color:${MUTED};">Este es un aviso automático. No respondas a este correo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
