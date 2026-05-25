import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email().describe('User email address'),
  password: z.string().min(1).describe('User password')
})

export const tokenResponseSchema = z.object({
  accessToken: z.string().describe('JWT access token (expires in 1h)')
})

export type LoginDTO = z.infer<typeof loginSchema>
