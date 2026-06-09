import * as z from 'zod'

export const loginSchema = z.object({
    email: z.email("Email invalid"),
    password: z.string().min(6, "Password is too short")
})

export type LoginFormFormData = z.infer<typeof loginSchema>