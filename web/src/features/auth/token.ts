import type { AuthUser } from './AuthContext';

// The API returns only { token }; the JWT payload carries the user claims
// (sub/email/role), so we derive the AuthUser from it.
export function userFromToken(token: string): AuthUser {
  const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as {
    sub: string;
    email: string;
    role: 'admin' | 'user';
  };
  return { id: payload.sub, email: payload.email, role: payload.role };
}
