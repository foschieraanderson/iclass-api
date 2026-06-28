import path from 'path'

import { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import { TaskService } from '@/services/task.service'
import { saveFile } from '@/utils/save-file'
import { createTaskSchema, updateTaskSchema } from '@/schemas/task.schema'
import type { TaskParamsDTO, TaskQueryDTO } from '@/schemas/task.schema'

function zodTo400(err: ZodError): never {
  const issues = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
  throw Object.assign(new Error(issues), { statusCode: 400 })
}

const service = new TaskService()

async function parseMultipart(request: FastifyRequest) {
  const fields: Record<string, string> = {}
  let fileUrl: string | undefined

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (part.filename) {
        fileUrl = await saveFile(part)
      } else {
        await part.toBuffer()
      }
    } else {
      fields[part.fieldname] = part.value as string
    }
  }

  return { fields, fileUrl }
}

export async function createTaskController(request: FastifyRequest, reply: FastifyReply) {
  const { fields, fileUrl } = await parseMultipart(request)
  const result = createTaskSchema.safeParse({ ...fields, score: fields.score !== undefined ? Number(fields.score) : undefined })
  if (!result.success) zodTo400(result.error)
  const task = await service.create(result.data, fileUrl, request.user.sub, request.user.role)
  return reply.status(201).send(task)
}

export async function listTasksController(request: FastifyRequest, reply: FastifyReply) {
  const { classId } = request.query as TaskQueryDTO
  const tasks = await service.findAll(classId, request.user.sub, request.user.role)
  return reply.send(tasks)
}

export async function getTaskController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as TaskParamsDTO
  const task = await service.findById(id)
  return reply.send(task)
}

export async function updateTaskController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as TaskParamsDTO
  const { fields, fileUrl } = await parseMultipart(request)
  const result = updateTaskSchema.safeParse({ ...fields, score: fields.score !== undefined ? Number(fields.score) : undefined })
  if (!result.success) zodTo400(result.error)
  const task = await service.update(id, result.data, fileUrl, request.user.sub, request.user.role)
  return reply.send(task)
}

export async function deleteTaskController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as TaskParamsDTO
  await service.delete(id, request.user.sub, request.user.role)
  return reply.status(204).send()
}

export async function downloadTaskFileController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as TaskParamsDTO
  const task = await service.findById(id)

  if (!task.fileUrl) {
    throw Object.assign(new Error('Esta tarefa não possui arquivo'), { statusCode: 404 })
  }

  const filename = path.basename(task.fileUrl)
  reply.header('Content-Disposition', `attachment; filename="${filename}"`)
  return reply.sendFile(filename)
}
