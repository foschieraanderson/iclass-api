import { FastifyReply, FastifyRequest } from 'fastify'

import { AuthService } from '@/services/auth.service'
import type { LoginDTO, RefreshBodyDTO } from '@/schemas/auth.schema'

const service = new AuthService()

export async function loginController(
  request: FastifyRequest<{ Body: LoginDTO }>,
  reply: FastifyReply
) {
  const user = await service.validateCredentials(request.body)

  const [accessToken, refreshToken] = await Promise.all([
    reply.jwtSign({ sub: user.id, role: user.role }, { expiresIn: '1h' }),
    reply.jwtSign({ sub: user.id, role: user.role, type: 'refresh' }, { expiresIn: '7d' })
  ])

  return reply.send({ accessToken, refreshToken })
}

export async function refreshController(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = request.body as RefreshBodyDTO

  try {
    const payload = request.server.jwt.verify<{ sub: string; role: string; type: string }>(refreshToken)

    if (payload.type !== 'refresh') {
      throw new Error('not a refresh token')
    }

    const accessToken = await reply.jwtSign({ sub: payload.sub, role: payload.role }, { expiresIn: '1h' })
    return reply.send({ accessToken })
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 })
  }
}
