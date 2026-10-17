import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = loginSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(50, 'Keep it under 50 characters'),
  password: z.string().min(8, 'Use at least 8 characters'),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const redirectSearchSchema = z.object({
  redirect: z
    .string()
    .refine((value) => value.startsWith('/') && !value.startsWith('//'))
    .optional()
    .catch(undefined),
})
