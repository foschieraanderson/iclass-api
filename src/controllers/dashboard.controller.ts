import { FastifyRequest, FastifyReply } from 'fastify'
import { DashboardService } from '@/services/dashboard.service'

const service = new DashboardService()

export async function getDashboardController(request: FastifyRequest, reply: FastifyReply) {
  const { sub, role } = request.user as { sub: string; role: string }

  if (role === 'student') return reply.send(await service.getForStudent(sub))
  if (role === 'teacher') return reply.send(await service.getForTeacher(sub))
  return reply.send(await service.getForAdmin())
}

export async function getDashboardChartsController(request: FastifyRequest, reply: FastifyReply) {
  const { sub, role } = request.user as { sub: string; role: string }

  if (role === 'teacher') return reply.send(await service.getChartsForTeacher(sub))
  if (role === 'admin') return reply.send(await service.getChartsForAdmin())
  return reply.status(403).send({ message: 'Forbidden' })
}
