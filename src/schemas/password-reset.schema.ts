import { z } from 'zod'

export const forgotPasswordBodySchema = z.object({
  email: z.email().describe('Email address to send the reset code to')
})

export const resetPasswordBodySchema = z.object({
  email: z.email().describe('Email address of the account'),
  code: z.string().length(6).describe('6-digit reset code received by email'),
  newPassword: z.string().min(8).describe('New password (minimum 8 characters)')
})

export const genericMessageResponseSchema = z.object({
  message: z.string().describe('Result message')
})

export type ForgotPasswordDTO = z.infer<typeof forgotPasswordBodySchema>
export type ResetPasswordDTO = z.infer<typeof resetPasswordBodySchema>
