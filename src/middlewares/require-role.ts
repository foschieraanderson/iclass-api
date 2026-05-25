import { FastifyReply, FastifyRequest } from 'fastify'

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = request.user
    if (!roles.includes(role)) {
      return reply.status(403).send({ message: 'Forbidden' })
    }
  }
}
