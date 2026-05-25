import { FastifyReply, FastifyRequest } from 'fastify'

import { ClassService } from '@/services/class.service'
import type { CreateClassDTO, UpdateClassDTO, ClassParamsDTO } from '@/schemas/class.schema'

const service = new ClassService()

export async function createClassController(request: FastifyRequest, reply: FastifyReply) {
  const cls = await service.create(request.body as CreateClassDTO)
  return reply.status(201).send(cls)
}

export async function listClassesController(_request: FastifyRequest, reply: FastifyReply) {
  const classes = await service.findAll()
  return reply.send(classes)
}

export async function getClassController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as ClassParamsDTO
  const cls = await service.findById(id)
  return reply.send(cls)
}

export async function updateClassController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as ClassParamsDTO
  const cls = await service.update(id, request.body as UpdateClassDTO)
  return reply.send(cls)
}

export async function deleteClassController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as ClassParamsDTO
  await service.delete(id)
  return reply.status(204).send()
}
