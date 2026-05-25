import { z } from 'zod'

import { userResponseSchema } from '@/schemas/user.schema'

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144] as const

const fibonacciScore = z.coerce
  .number()
  .int()
  .refine((v) => (FIBONACCI as readonly number[]).includes(v), {
    message: `Score must be a Fibonacci number (${FIBONACCI.join(', ')})`
  })
  .describe(`Difficulty/time score — Fibonacci value (${FIBONACCI.join(', ')})`)

export const createTaskSchema = z.object({
  classId: z.string().describe('UUID of the class this task belongs to'),
  title: z.string().min(1).describe('Task title'),
  description: z.string().optional().describe('Optional task description'),
  expiresAt: z.string().datetime().optional().describe('Expiration date (ISO 8601)'),
  score: fibonacciScore
})

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).optional().describe('Task title'),
    description: z.string().optional().describe('Task description'),
    expiresAt: z.string().datetime().optional().describe('Expiration date (ISO 8601)'),
    score: fibonacciScore.optional()
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'At least one field must be provided'
  })

export const taskParamsSchema = z.object({
  id: z.string().describe('Task UUID v7')
})

export const taskQuerySchema = z.object({
  classId: z.string().optional().describe('Filter tasks by class UUID')
})

const classRefSchema = z.object({
  id: z.string(),
  code: z.string(),
  period: z.string(),
  grade: z.string()
})

export const taskResponseSchema = z.object({
  id: z.string(),
  classId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  fileUrl: z.string().nullable(),
  score: z.number(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  class: classRefSchema,
  createdBy: userResponseSchema
})

export type CreateTaskDTO = z.infer<typeof createTaskSchema>
export type UpdateTaskDTO = z.infer<typeof updateTaskSchema>
export type TaskParamsDTO = z.infer<typeof taskParamsSchema>
export type TaskQueryDTO = z.infer<typeof taskQuerySchema>
