import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email().describe('User email address'),
  password: z.string().min(1).describe('User password')
})

export const loginResponseSchema = z.object({
  accessToken: z.string().describe('JWT access token (expires in 1h)'),
  refreshToken: z.string().describe('JWT refresh token (expires in 7d)')
})

export const refreshBodySchema = z.object({
  refreshToken: z.string().describe('Refresh token obtained at login')
})

export const accessTokenResponseSchema = z.object({
  accessToken: z.string().describe('New JWT access token (expires in 1h)')
})

export type LoginDTO = z.infer<typeof loginSchema>
export type RefreshBodyDTO = z.infer<typeof refreshBodySchema>
