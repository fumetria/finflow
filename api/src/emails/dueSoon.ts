import {
  BRAND,
  LOGO_ATTACHMENT,
  MUTED,
  detailRow,
  escapeHtml,
  renderLayout,
  type BuiltEmail,
} from './layout.js';

/**
 * The fields this template reads from a due-soon event. Declared structurally
 * so the worker's `DueSoonEvent` (worker/src/kafka.ts) satisfies it without the
 * api having to import from the worker.
 */
export interface DueSoonEmailData {
  concept: string;
  amount: string;
  currency: string;
  accountName: string;
  dueDate: string; // ISO 8601
}

/** Builds the due-soon email: subject + plain-text fallback + branded HTML. */
export function buildDueSoonEmail(event: DueSoonEmailData): BuiltEmail {
  const due = new Date(event.dueDate).toLocaleDateString('es-ES');
  // Amount arrives as a plain decimal string (e.g. "32.90"); use the comma
  // decimal separator expected in es-ES.
  const money = `${event.amount.replace('.', ',')} ${event.currency}`;

  const subject = `Pago próximo: ${event.concept} (${money})`;

  const text =
    `Tienes un pago pendiente "${event.concept}" por ${money} ` +
    `en la cuenta "${event.accountName}", con vencimiento el ${due}.`;

  // Escaped copies for HTML interpolation.
  const concept = escapeHtml(event.concept);
  const accountName = escapeHtml(event.accountName);
  const amount = escapeHtml(money);
  const dueSafe = escapeHtml(due);

  const html = renderLayout({
    eyebrow: 'Pago próximo',
    title: 'Tienes un pago próximo a vencer',
    bodyHtml: `<p style="margin:0;font-size:13px;color:${MUTED};">Importe</p>
              <p style="margin:2px 0 24px 0;font-size:32px;font-weight:800;letter-spacing:-0.02em;color:${BRAND};">${amount}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRow('Concepto', concept)}${detailRow('Cuenta', accountName)}${detailRow('Vencimiento', dueSafe, true)}
              </table>`,
  });

  return { subject, text, html, attachments: [LOGO_ATTACHMENT] };
}
