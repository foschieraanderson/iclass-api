import { FastifyInstance } from 'fastify'

import {
  createTaskController,
  listTasksController,
  getTaskController,
  updateTaskController,
  deleteTaskController
} from '@/controllers/task.controller'
import { createSubmissionController, listTaskSubmissionsController } from '@/controllers/submission.controller'
import { taskParamsSchema, taskQuerySchema, taskResponseSchema } from '@/schemas/task.schema'
import { taskSubmissionParamsSchema, submissionResponseSchema } from '@/schemas/submission.schema'
import { errorSchema } from '@/schemas/common.schema'
import { requireRole } from '@/middlewares/require-role'

const authHeader = { security: [{ bearerAuth: [] }] }

export async function taskRoutes(app: FastifyInstance) {
  const teacherOrAdmin = [app.authenticate, requireRole('teacher', 'admin')]
  const studentOnly = [app.authenticate, requireRole('student')]

  app.post('/', {
    onRequest: teacherOrAdmin,
    schema: {
      ...authHeader,
      tags: ['Tasks'],
      summary: 'Create task',
      description: 'Creates a new task (multipart/form-data). Teachers can only create tasks for their own classes.',
      consumes: ['multipart/form-data'],
      response: {
        201: taskResponseSchema,
        400: errorSchema,
        403: errorSchema,
        404: errorSchema
      }
    }
  }, createTaskController)

  app.get('/', {
    onRequest: [app.authenticate],
    schema: {
      ...authHeader,
      tags: ['Tasks'],
      summary: 'List tasks',
      description: 'Returns tasks. Optionally filter by classId. Teachers see only their own classes\' tasks.',
      querystring: taskQuerySchema,
      response: {
        200: taskResponseSchema.array(),
        401: errorSchema,
        403: errorSchema
      }
    }
  }, listTasksController)

  app.get('/:id', {
    onRequest: [app.authenticate],
    schema: {
      ...authHeader,
      tags: ['Tasks'],
      summary: 'Get task',
      description: 'Returns a single task by ID.',
      params: taskParamsSchema,
      response: {
        200: taskResponseSchema,
        401: errorSchema,
        404: errorSchema
      }
    }
  }, getTaskController)

  app.patch('/:id', {
    onRequest: teacherOrAdmin,
    schema: {
      ...authHeader,
      tags: ['Tasks'],
      summary: 'Update task',
      description: 'Partially updates a task (multipart/form-data). Teachers can only update tasks from their own classes.',
      consumes: ['multipart/form-data'],
      params: taskParamsSchema,
      response: {
        200: taskResponseSchema,
        400: errorSchema,
        403: errorSchema,
        404: errorSchema
      }
    }
  }, updateTaskController)

  app.post('/:taskId/submissions', {
    onRequest: studentOnly,
    schema: {
      ...authHeader,
      tags: ['Submissions'],
      summary: 'Submit answer',
      description: 'Submits a text answer and/or file for a task (multipart/form-data). Students can only submit to tasks from their enrolled classes.',
      consumes: ['multipart/form-data'],
      params: taskSubmissionParamsSchema,
      response: {
        201: submissionResponseSchema,
        400: errorSchema,
        403: errorSchema,
        404: errorSchema,
        409: errorSchema
      }
    }
  }, createSubmissionController)

  app.get('/:taskId/submissions', {
    onRequest: teacherOrAdmin,
    schema: {
      ...authHeader,
      tags: ['Submissions'],
      summary: 'List task submissions',
      description: 'Lists all submissions for a task. Teachers can only view submissions from their own classes.',
      params: taskSubmissionParamsSchema,
      response: {
        200: submissionResponseSchema.array(),
        403: errorSchema,
        404: errorSchema
      }
    }
  }, listTaskSubmissionsController)

  app.delete('/:id', {
    onRequest: teacherOrAdmin,
    schema: {
      ...authHeader,
      tags: ['Tasks'],
      summary: 'Delete task',
      description: 'Removes a task. Teachers can only delete tasks from their own classes.',
      params: taskParamsSchema,
      response: {
        403: errorSchema,
        404: errorSchema
      }
    }
  }, deleteTaskController)
}
