import * as z from 'zod';

// Login and register share the same fields (the API's registerSchema only takes
// email + password — no name), so a single schema covers both auth modes.
// min(8) mirrors the backend's password rule.
export const loginSchema = z.object({
  email: z.email('Email invalid'),
  password: z.string().min(8, 'Password is too short'),
});

export type LoginFormFormData = z.infer<typeof loginSchema>;
