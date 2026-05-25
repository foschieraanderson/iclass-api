import { FastifyReply, FastifyRequest } from 'fastify'

import { AuthService } from '@/services/auth.service'
import type { LoginDTO } from '@/schemas/auth.schema'

const service = new AuthService()

export async function loginController(
  request: FastifyRequest<{ Body: LoginDTO }>,
  reply: FastifyReply
) {
  const user = await service.validateCredentials(request.body)

  const accessToken = await reply.jwtSign(
    { sub: user.id, role: user.role },
    { expiresIn: '1h' }
  )

  return reply.send({ accessToken })
}
