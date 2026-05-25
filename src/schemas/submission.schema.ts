import { z } from 'zod'

import { userResponseSchema } from '@/schemas/user.schema'

export const createSubmissionSchema = z
  .object({
    textAnswer: z.string().min(1).optional().describe('Text answer for the task')
  })
  .refine((d) => d.textAnswer !== undefined, {
    message: 'At least a text answer or a file must be provided'
  })

export const gradeSubmissionSchema = z.object({
  grade: z.number().int().min(0).max(100).describe('Grade (0–100)'),
  feedback: z.string().optional().describe('Optional teacher feedback')
})

export const submissionParamsSchema = z.object({
  id: z.string().describe('Submission UUID v7')
})

export const taskSubmissionParamsSchema = z.object({
  taskId: z.string().describe('Task UUID v7')
})

const taskRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number(),
  expiresAt: z.date().nullable(),
  class: z.object({ id: z.string(), code: z.string() })
})

export const submissionResponseSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  studentId: z.string(),
  textAnswer: z.string().nullable(),
  fileUrl: z.string().nullable(),
  grade: z.number().nullable(),
  feedback: z.string().nullable(),
  gradedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  task: taskRefSchema,
  student: userResponseSchema
})

const reportTaskRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number(),
  expiresAt: z.date().nullable(),
  class: z.object({ id: z.string(), code: z.string() })
})

const reportItemSchema = z.object({
  task: reportTaskRefSchema,
  status: z.enum(['submitted', 'pending', 'expired']),
  onTime: z.boolean().nullable(),
  submission: z.object({
    id: z.string(),
    grade: z.number().nullable(),
    gradedAt: z.date().nullable(),
    createdAt: z.date()
  }).nullable()
})

export const studentTaskReportSchema = z.object({
  summary: z.object({
    total: z.number(),
    submitted: z.number(),
    pending: z.number(),
    expired: z.number(),
    onTime: z.number(),
    late: z.number(),
    graded: z.number(),
    totalEarned: z.number(),
    totalPossible: z.number()
  }),
  tasks: z.array(reportItemSchema)
})

export type CreateSubmissionDTO = z.infer<typeof createSubmissionSchema>
export type GradeSubmissionDTO = z.infer<typeof gradeSubmissionSchema>
export type SubmissionParamsDTO = z.infer<typeof submissionParamsSchema>
export type TaskSubmissionParamsDTO = z.infer<typeof taskSubmissionParamsSchema>
