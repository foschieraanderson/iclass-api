import { FastifyInstance } from 'fastify'

import {
  downloadSubmissionFileController,
  listMineController,
  getStudentReportController,
  getSubmissionController,
  gradeSubmissionController
} from '@/controllers/submission.controller'
import { submissionParamsSchema, gradeSubmissionSchema, submissionResponseSchema, studentTaskReportSchema } from '@/schemas/submission.schema'
import { errorSchema } from '@/schemas/common.schema'
import { requireRole } from '@/middlewares/require-role'

const authHeader = { security: [{ bearerAuth: [] }] }

export async function submissionRoutes(app: FastifyInstance) {
  const teacherOrAdmin = [app.authenticate, requireRole('teacher', 'admin')]
  const studentOnly = [app.authenticate, requireRole('student')]

  app.get('/mine', {
    onRequest: [app.authenticate],
    schema: {
      ...authHeader,
      tags: ['Submissions'],
      summary: 'My submissions',
      description: 'Returns all submissions made by the authenticated student.',
      response: {
        200: submissionResponseSchema.array(),
        401: errorSchema
      }
    }
  }, listMineController)

  app.get('/report', {
    onRequest: studentOnly,
    schema: {
      ...authHeader,
      tags: ['Submissions'],
      summary: 'Student task report',
      description: 'Returns a consolidated report of all tasks for the authenticated student: submitted, pending, expired, on time, and late.',
      response: {
        200: studentTaskReportSchema,
        401: errorSchema,
        403: errorSchema
      }
    }
  }, getStudentReportController)

  app.get('/:id/download', {
    onRequest: [app.authenticate],
    schema: {
      ...authHeader,
      tags: ['Submissions'],
      summary: 'Download submission file',
      description: 'Downloads the PDF file attached to a submission. Students can only download their own; teachers can only download from their own tasks.',
      params: submissionParamsSchema,
      response: {
        401: errorSchema,
        403: errorSchema,
        404: errorSchema
      }
    }
  }, downloadSubmissionFileController)

  app.get('/:id', {
    onRequest: [app.authenticate],
    schema: {
      ...authHeader,
      tags: ['Submissions'],
      summary: 'Get submission',
      description: 'Returns a single submission. Students can only view their own; teachers can only view submissions from their classes.',
      params: submissionParamsSchema,
      response: {
        200: submissionResponseSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema
      }
    }
  }, getSubmissionController)

  app.patch('/:id', {
    onRequest: teacherOrAdmin,
    schema: {
      ...authHeader,
      tags: ['Submissions'],
      summary: 'Grade submission',
      description: 'Adds grade and optional feedback to a submission. Teachers can only grade submissions from their own classes.',
      params: submissionParamsSchema,
      body: gradeSubmissionSchema,
      response: {
        200: submissionResponseSchema,
        400: errorSchema,
        403: errorSchema,
        404: errorSchema
      }
    }
  }, gradeSubmissionController)
}
