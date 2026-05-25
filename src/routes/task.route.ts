import { FastifyInstance } from 'fastify'

import {
  createTaskController,
  listTasksController,
  getTaskController,
  updateTaskController,
  deleteTaskController
} from '@/controllers/task.controller'
import { taskParamsSchema, taskQuerySchema, taskResponseSchema } from '@/schemas/task.schema'
import { errorSchema } from '@/schemas/common.schema'
import { requireRole } from '@/middlewares/require-role'

const authHeader = { security: [{ bearerAuth: [] }] }

export async function taskRoutes(app: FastifyInstance) {
  const teacherOrAdmin = [app.authenticate, requireRole('teacher', 'admin')]

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
