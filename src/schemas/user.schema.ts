import { z } from 'zod'

export const userRoleSchema = z.enum(['admin', 'teacher', 'student'])

export const createUserSchema = z.object({
  name: z.string().min(3).max(100).describe('Full name of the user'),
  email: z.email().describe('Unique email address of the user'),
  password: z.string().min(6).describe('Password (min 6 characters)'),
  role: userRoleSchema.default('student').describe('User role')
})

export const updateUserSchema = z
  .object({
    name: z.string().min(3).max(100).describe('Full name of the user').optional(),
    email: z.email().describe('Unique email address of the user').optional(),
    password: z.string().min(6).describe('New password (min 6 characters)').optional(),
    role: userRoleSchema.describe('User role').optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  })

export const userParamsSchema = z.object({
  id: z.string().describe('User UUID v7')
})

export const userResponseSchema = z.object({
  id: z.string().describe('Unique identifier (UUID v7)'),
  name: z.string().describe('Full name of the user'),
  email: z.email().describe('Unique email address of the user'),
  role: userRoleSchema.describe('User role'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp')
})

export const listUsersQuerySchema = z.object({
  role: userRoleSchema.optional().describe('Filter users by role')
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).describe('Current user password'),
  newPassword: z.string().min(6).describe('New password (min 6 characters)')
})

export type CreateUserDTO = z.infer<typeof createUserSchema>
export type UpdateUserDTO = z.infer<typeof updateUserSchema>
export type UserParamsDTO = z.infer<typeof userParamsSchema>
export type ListUsersQueryDTO = z.infer<typeof listUsersQuerySchema>
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>
