import { z } from 'zod'

/**
 * Auth form validation.
 *
 * Kept intentionally friendly and non-punitive (InteractionPrinciples §3, §6):
 * messages guide, never scold. Validation runs on submit, not on every
 * keystroke, so the player is never flashed an error while still typing.
 */

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email to continue.')
  .email('That doesn’t look like a complete email yet — mind checking it?')

// Supabase enforces a minimum server-side; 8 is our quality floor.
const password = z
  .string()
  .min(8, 'Use at least 8 characters — a little length goes a long way.')

const displayName = z
  .string()
  .trim()
  .min(1, 'Pick a name we can greet you by.')
  .max(50, 'That name is a touch long — keep it under 50 characters.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password to continue.'),
})

export const signupSchema = z.object({
  displayName,
  email,
  password,
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'These don’t match yet — try re-typing the second one.',
    path: ['confirmPassword'],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
