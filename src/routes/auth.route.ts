import { FastifyInstance } from 'fastify'

import { loginController, refreshController } from '@/controllers/auth.controller'
import { makePasswordResetController } from '@/controllers/password-reset.controller'
import { loginSchema, loginResponseSchema, refreshBodySchema, accessTokenResponseSchema } from '@/schemas/auth.schema'
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
        description: 'Authenticates a user and returns an access token (1h) and a refresh token (7d).',
        body: loginSchema,
        response: {
          200: loginResponseSchema,
          401: errorSchema
        }
      }
    },
    loginController
  )

  app.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh token',
        description: 'Issues a new access token using a valid refresh token.',
        body: refreshBodySchema,
        response: {
          200: accessTokenResponseSchema,
          401: errorSchema
        }
      }
    },
    refreshController
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
