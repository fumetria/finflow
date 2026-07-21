// Every finflow email template lives in this folder and is re-exported here.
// Consumers (api and worker) import from `@finflow/api/emails`.
export { buildVerificationEmail } from './verification.js';
export { buildDueSoonEmail, type DueSoonEmailData } from './dueSoon.js';
export type { BuiltEmail } from './layout.js';
