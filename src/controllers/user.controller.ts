import { FastifyReply, FastifyRequest } from 'fastify'

import { UserService } from '@/services/user.service'
import type { CreateUserDTO, UpdateUserDTO, UserParamsDTO } from '@/schemas/user.schema'

const service = new UserService()

export async function createUserController(
  request: FastifyRequest<{ Body: CreateUserDTO }>,
  reply: FastifyReply
) {
  const user = await service.create(request.body)
  return reply.status(201).send(user)
}

export async function listUsersController(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const users = await service.findAll()
  return reply.send(users)
}

export async function getUserController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as UserParamsDTO
  const user = await service.findById(id)
  return reply.send(user)
}

export async function updateUserController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as UserParamsDTO
  const user = await service.update(id, request.body as UpdateUserDTO)
  return reply.send(user)
}

export async function deleteUserController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as UserParamsDTO
  await service.delete(id)
  return reply.status(204).send()
}
