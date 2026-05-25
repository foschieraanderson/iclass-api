import { FastifyReply, FastifyRequest } from 'fastify'

import { SubmissionService } from '@/services/submission.service'
import { saveFile } from '@/utils/save-file'
import type { SubmissionParamsDTO, TaskSubmissionParamsDTO, GradeSubmissionDTO } from '@/schemas/submission.schema'

const service = new SubmissionService()

export async function createSubmissionController(request: FastifyRequest, reply: FastifyReply) {
  const { taskId } = request.params as TaskSubmissionParamsDTO
  const fields: Record<string, string> = {}
  let fileUrl: string | undefined

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (part.filename) fileUrl = await saveFile(part)
      else await part.toBuffer()
    } else {
      fields[part.fieldname] = part.value as string
    }
  }

  const textAnswer = fields.textAnswer?.trim() || undefined

  const submission = await service.create(taskId, textAnswer, fileUrl, request.user.sub)
  return reply.status(201).send(submission)
}

export async function listTaskSubmissionsController(request: FastifyRequest, reply: FastifyReply) {
  const { taskId } = request.params as TaskSubmissionParamsDTO
  const submissions = await service.findByTask(taskId, request.user.sub, request.user.role)
  return reply.send(submissions)
}

export async function listMineController(request: FastifyRequest, reply: FastifyReply) {
  const submissions = await service.findMine(request.user.sub)
  return reply.send(submissions)
}

export async function getSubmissionController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as SubmissionParamsDTO
  const submission = await service.findById(id, request.user.sub, request.user.role)
  return reply.send(submission)
}

export async function gradeSubmissionController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as SubmissionParamsDTO
  const submission = await service.grade(id, request.body as GradeSubmissionDTO, request.user.sub, request.user.role)
  return reply.send(submission)
}
