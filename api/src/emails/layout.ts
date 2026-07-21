import { fileURLToPath } from 'node:url';

// Brand tokens copied from the frontend (web/src/index.css). The emails don't
// share the web CSS, so the hex values live here as constants.
export const BRAND = '#0d9488'; // teal, --brand
export const INK = '#18181b'; // near-black text, --foreground
export const MUTED = '#71717a'; // --muted-foreground
export const BORDER = '#e4e4e7'; // --border
const PAGE_BG = '#f4f4f5'; // neutral page background
const CARD_BG = '#ffffff';

const FONT_STACK = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

// The finflow logo ships as a rasterized PNG embedded via CID (email clients
// don't render SVG reliably). Source: ./assets/logo.svg. The path resolves
// relative to this module, so it works both under tsx and in the container.
const LOGO_CID = 'finflow-logo';
export const LOGO_ATTACHMENT = {
  filename: 'finflow-logo.png',
  path: fileURLToPath(new URL('./assets/logo@2x.png', import.meta.url)),
  cid: LOGO_CID,
} as const;

/** Escapes user-provided values before interpolating them into the HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A key/value row for the detail table inside an email body. Pass `last` on the
 * final row to drop its bottom border.
 */
export function detailRow(label: string, value: string, last = false): string {
  const border = last ? '' : `border-bottom:1px solid ${BORDER};`;
  return `
              <tr>
                <td style="padding:12px 0;${border}font-size:14px;color:${MUTED};">${label}</td>
                <td style="padding:12px 0;${border}font-size:14px;color:${INK};font-weight:600;text-align:right;">${value}</td>
              </tr>`;
}

/** A teal call-to-action button. `url` is emitted raw — never pass user input. */
export function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background-color:${BRAND};border-radius:8px;">
                  <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
                </td>
              </tr></table>`;
}

interface LayoutOptions {
  /** Small uppercase kicker above the heading. */
  eyebrow: string;
  /** The email's <h1>. */
  title: string;
  /** Already-escaped HTML for the body, below the heading. */
  bodyHtml: string;
}

/**
 * The shared finflow email shell: teal header with the logo, white card on a
 * neutral page, and the automated-notice footer. Table-based and inline-styled
 * because that's the subset of HTML/CSS email clients agree on.
 */
export function renderLayout({ eyebrow, title, bodyHtml }: LayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background-color:${CARD_BG};border-radius:12px;overflow:hidden;border:1px solid ${BORDER};font-family:${FONT_STACK};">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND};padding:20px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="cid:${LOGO_CID}" width="30" height="30" alt="finflow" style="display:block;border:0;width:30px;height:30px;" />
                  </td>
                  <td style="vertical-align:middle;padding-left:12px;font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">finflow</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:${BRAND};">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:700;color:${INK};">${escapeHtml(title)}</h1>
              ${bodyHtml}
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
}

/** What every template returns; spread straight into nodemailer's sendMail. */
export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
  attachments: [typeof LOGO_ATTACHMENT];
}
