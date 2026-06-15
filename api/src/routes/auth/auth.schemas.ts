import * as z from 'zod';

export const registerSchema = z.object({
  email: z.email('Email invalid'),
  password: z.string().min(8, 'Password is too short'),
});

export const loginSchema = z.object({
  email: z.email('Email invalid'),
  password: z.string().min(8, 'Password is too short'),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
