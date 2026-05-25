import { FastifyInstance } from 'fastify'

import { loginController } from '@/controllers/auth.controller'
import { loginSchema, tokenResponseSchema } from '@/schemas/auth.schema'
import { errorSchema } from '@/schemas/common.schema'

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Authenticates a user and returns a JWT access token.',
        body: loginSchema,
        response: {
          200: tokenResponseSchema,
          401: errorSchema
        }
      }
    },
    loginController
  )
}
