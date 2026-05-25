import { FastifyInstance } from 'fastify'

import { loginController } from '@/controllers/auth.controller'
import { makePasswordResetController } from '@/controllers/password-reset.controller'
import { loginSchema, tokenResponseSchema } from '@/schemas/auth.schema'
import { forgotPasswordBodySchema, resetPasswordBodySchema, genericMessageResponseSchema } from '@/schemas/password-reset.schema'
import { errorSchema } from '@/schemas/common.schema'

export async function authRoutes(app: FastifyInstance) {
  const { forgotPasswordController, resetPasswordController } = makePasswordResetController(app)

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

  app.post(
    '/forgot-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Forgot password',
        description: 'Sends a 6-digit reset code to the email address if it is registered.',
        body: forgotPasswordBodySchema,
        response: {
          200: genericMessageResponseSchema
        }
      }
    },
    forgotPasswordController
  )

  app.post(
    '/reset-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Reset password',
        description: 'Validates the 6-digit code and sets a new password.',
        body: resetPasswordBodySchema,
        response: {
          200: genericMessageResponseSchema,
          400: errorSchema
        }
      }
    },
    resetPasswordController
  )
}
