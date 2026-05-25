import { FastifyInstance } from 'fastify'

import {
  createUserController,
  getMeController,
  listUsersController,
  getUserController,
  updateUserController,
  deleteUserController
} from '@/controllers/user.controller'
import { createUserSchema, updateUserSchema, userParamsSchema, userResponseSchema } from '@/schemas/user.schema'
import { errorSchema } from '@/schemas/common.schema'
import { requireRole } from '@/middlewares/require-role'

const authHeader = { security: [{ bearerAuth: [] }] }

export async function userRoutes(app: FastifyInstance) {
  const adminOnly = [app.authenticate, requireRole('admin')]

  app.post(
    '/',
    {
      onRequest: adminOnly,
      schema: {
        ...authHeader,
        tags: ['Users'],
        summary: 'Create user',
        description: 'Creates a new user. Requires admin role.',
        body: createUserSchema,
        response: {
          201: userResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema
        }
      }
    },
    createUserController
  )

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        ...authHeader,
        tags: ['Users'],
        summary: 'List users',
        description: 'Returns all registered users.',
        response: {
          200: userResponseSchema.array(),
          401: errorSchema
        }
      }
    },
    listUsersController
  )

  app.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        ...authHeader,
        tags: ['Users'],
        summary: 'Get current user',
        description: 'Returns the authenticated user\'s own data.',
        response: {
          200: userResponseSchema,
          401: errorSchema
        }
      }
    },
    getMeController
  )

  app.get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        ...authHeader,
        tags: ['Users'],
        summary: 'Get user',
        description: 'Returns a single user by ID.',
        params: userParamsSchema,
        response: {
          200: userResponseSchema,
          401: errorSchema,
          404: errorSchema
        }
      }
    },
    getUserController
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        ...authHeader,
        tags: ['Users'],
        summary: 'Update user',
        description: 'Partially updates a user.',
        params: userParamsSchema,
        body: updateUserSchema,
        response: {
          200: userResponseSchema,
          401: errorSchema,
          404: errorSchema
        }
      }
    },
    updateUserController
  )

  app.delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        ...authHeader,
        tags: ['Users'],
        summary: 'Delete user',
        description: 'Removes a user by ID.',
        params: userParamsSchema,
        response: {
          401: errorSchema,
          404: errorSchema
        }
      }
    },
    deleteUserController
  )
}
