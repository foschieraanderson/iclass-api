import { z } from 'zod'

import { userResponseSchema } from '@/schemas/user.schema'

export const createClassSchema = z.object({
  period: z.string().regex(/^\d{4}\/[12]$/, { message: 'Period must be in format YYYY/1 or YYYY/2' }).describe('Academic period (e.g. 2026/1)'),
  grade: z
    .string()
    .regex(/^[0-9]{1,2}[A-Za-z]{1,2}$/, { message: 'Grade must be like 3A, 10B, etc.' })
    .transform((s) => s.toUpperCase())
    .describe('Class grade/series (e.g. 3A, 5B)'),
  teacherId: z.string().describe('UUID of the teacher user'),
  studentIds: z.array(z.string()).min(1, { message: 'At least one student is required' }).describe('Array of student UUIDs')
})

export const updateClassSchema = z
  .object({
    period: z
      .string()
      .regex(/^\d{4}\/[12]$/, { message: 'Period must be in format YYYY/1 or YYYY/2' })
      .optional(),
    grade: z
      .string()
      .regex(/^[0-9]{1,2}[A-Za-z]{1,2}$/, { message: 'Grade must be like 3A, 10B, etc.' })
      .transform((s) => s.toUpperCase())
      .optional(),
    teacherId: z.string().optional(),
    studentIds: z.array(z.string()).min(1, { message: 'At least one student is required' }).optional()
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' })

export const classParamsSchema = z.object({
  id: z.string().describe('Class UUID v7')
})

export const classResponseSchema = z.object({
  id: z.string(),
  code: z.string().describe('Auto-generated unique code (e.g. 2026/1-3A)'),
  period: z.string(),
  grade: z.string(),
  teacher: userResponseSchema,
  students: z.array(userResponseSchema),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const classStudentBulkSchema = z.object({
  studentIds: z.array(z.string()).min(1, { message: 'At least one student ID is required' }).describe('Array of student UUIDs')
})

export type CreateClassDTO = z.infer<typeof createClassSchema>
export type UpdateClassDTO = z.infer<typeof updateClassSchema>
export type ClassParamsDTO = z.infer<typeof classParamsSchema>
export type ClassStudentBulkDTO = z.infer<typeof classStudentBulkSchema>
