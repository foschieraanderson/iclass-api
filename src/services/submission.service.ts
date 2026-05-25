import { prisma } from '@/database/prisma'
import { SubmissionRepository } from '@/repositories/submission.repository'
import { TaskRepository } from '@/repositories/task.repository'
import type { GradeSubmissionDTO } from '@/schemas/submission.schema'

const repository = new SubmissionRepository()
const taskRepository = new TaskRepository()

export class SubmissionService {
  async create(taskId: string, textAnswer: string | undefined, fileUrl: string | undefined, requesterId: string) {
    if (!textAnswer && !fileUrl) {
      throw Object.assign(new Error('At least a text answer or a file must be provided'), { statusCode: 400 })
    }

    const task = await taskRepository.findByIdWithClass(taskId)
    if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 })

    const enrolled = await prisma.classStudent.findUnique({
      where: { classId_studentId: { classId: task.classId, studentId: requesterId } }
    })
    if (!enrolled) throw Object.assign(new Error('Forbidden'), { statusCode: 403 })

    const existing = await repository.findByTaskAndStudent(taskId, requesterId)
    if (existing) throw Object.assign(new Error('Submission already exists for this task'), { statusCode: 409 })

    return repository.create(taskId, requesterId, textAnswer, fileUrl)
  }

  async findByTask(taskId: string, requesterId: string, requesterRole: string) {
    const task = await taskRepository.findByIdWithClass(taskId)
    if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 })

    if (requesterRole === 'teacher' && task.class.teacherId !== requesterId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    }

    return repository.findByTaskId(taskId)
  }

  async findMine(requesterId: string) {
    return repository.findByStudentId(requesterId)
  }

  async findById(id: string, requesterId: string, requesterRole: string) {
    const submission = await repository.findByIdWithClass(id)
    if (!submission) throw Object.assign(new Error('Submission not found'), { statusCode: 404 })

    if (requesterRole === 'student' && submission.studentId !== requesterId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    }

    if (requesterRole === 'teacher' && submission.task.class.teacherId !== requesterId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    }

    return repository.findById(id)
  }

  async grade(id: string, data: GradeSubmissionDTO, requesterId: string, requesterRole: string) {
    const submission = await repository.findByIdWithClass(id)
    if (!submission) throw Object.assign(new Error('Submission not found'), { statusCode: 404 })

    if (requesterRole === 'teacher' && submission.task.class.teacherId !== requesterId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    }

    return repository.grade(id, data.grade, data.feedback)
  }
}
