import * as z from 'zod';

export const registerSchema = z.object({
  email: z.email('Email invalid'),
  password: z.string().min(8, 'Password is too short'),
});

export const loginSchema = z.object({
  email: z.email('Email invalid'),
  password: z.string().min(8, 'Password is too short'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const resendVerificationSchema = z.object({
  email: z.email('Email invalid'),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>;
