import { FastifyInstance } from 'fastify'

import {
  createClassController,
  listClassesController,
  getClassController,
  updateClassController,
  deleteClassController,
  addStudentsController,
  removeStudentsController
} from '@/controllers/class.controller'
import { createClassSchema, updateClassSchema, classParamsSchema, classResponseSchema, classStudentBulkSchema } from '@/schemas/class.schema'
import { errorSchema } from '@/schemas/common.schema'
import { requireRole } from '@/middlewares/require-role'

const authHeader = { security: [{ bearerAuth: [] }] }

export async function classRoutes(app: FastifyInstance) {
  const adminOnly = [app.authenticate, requireRole('admin')]

  app.post(
    '/',
    {
      onRequest: adminOnly,
      schema: {
        ...authHeader,
        tags: ['Classes'],
        summary: 'Create class',
        description: 'Creates a new class. Requires admin role.',
        body: createClassSchema,
        response: {
          201: classResponseSchema,
          400: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
          422: errorSchema
        }
      }
    },
    createClassController
  )

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        ...authHeader,
        tags: ['Classes'],
        summary: 'List classes',
        description: 'Returns all classes.',
        response: {
          200: classResponseSchema.array(),
          401: errorSchema
        }
      }
    },
    listClassesController
  )

  app.get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        ...authHeader,
        tags: ['Classes'],
        summary: 'Get class',
        description: 'Returns a single class by ID.',
        params: classParamsSchema,
        response: {
          200: classResponseSchema,
          401: errorSchema,
          404: errorSchema
        }
      }
    },
    getClassController
  )

  app.patch(
    '/:id',
    {
      onRequest: adminOnly,
      schema: {
        ...authHeader,
        tags: ['Classes'],
        summary: 'Update class',
        description: 'Partially updates a class. Requires admin role.',
        params: classParamsSchema,
        body: updateClassSchema,
        response: {
          200: classResponseSchema,
          400: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
          422: errorSchema
        }
      }
    },
    updateClassController
  )

  app.delete(
    '/:id',
    {
      onRequest: adminOnly,
      schema: {
        ...authHeader,
        tags: ['Classes'],
        summary: 'Delete class',
        description: 'Removes a class. Requires admin role.',
        params: classParamsSchema,
        response: {
          401: errorSchema,
          403: errorSchema,
          404: errorSchema
        }
      }
    },
    deleteClassController
  )

  app.post(
    '/:id/students',
    {
      onRequest: adminOnly,
      schema: {
        ...authHeader,
        tags: ['Classes'],
        summary: 'Add students to class',
        description: 'Adds one or more students to an existing class. Already-enrolled students are ignored.',
        params: classParamsSchema,
        body: classStudentBulkSchema,
        response: {
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          422: errorSchema
        }
      }
    },
    addStudentsController
  )

  app.delete(
    '/:id/students',
    {
      onRequest: adminOnly,
      schema: {
        ...authHeader,
        tags: ['Classes'],
        summary: 'Remove students from class',
        description: 'Removes one or more students from a class. Students not enrolled are ignored.',
        params: classParamsSchema,
        body: classStudentBulkSchema,
        response: {
          401: errorSchema,
          403: errorSchema,
          404: errorSchema
        }
      }
    },
    removeStudentsController
  )
}
