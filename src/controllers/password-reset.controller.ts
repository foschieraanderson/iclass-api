import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { PasswordResetService } from '@/services/password-reset.service'
import type { ForgotPasswordDTO, ResetPasswordDTO } from '@/schemas/password-reset.schema'

export function makePasswordResetController(app: FastifyInstance) {
  const service = new PasswordResetService(app)

  return {
    async forgotPasswordController(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as ForgotPasswordDTO
      const result = await service.requestPasswordReset(body)
      return reply.status(200).send(result)
    },

    async resetPasswordController(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as ResetPasswordDTO
      const result = await service.resetPassword(body)
      return reply.status(200).send(result)
    }
  }
}
