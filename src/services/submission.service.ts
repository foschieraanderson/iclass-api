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

  async getStudentReport(studentId: string) {
    const tasks = await taskRepository.findAllForStudentWithSubmissions(studentId)
    const now = new Date()

    const items = tasks.map((task) => {
      const sub = task.submissions[0] ?? null
      const expired = !!task.expiresAt && task.expiresAt <= now
      const status = sub ? 'submitted' : expired ? 'expired' : 'pending'
      const onTime = sub ? (!task.expiresAt || sub.createdAt <= task.expiresAt!) : null
      return {
        task: { id: task.id, title: task.title, score: task.score, expiresAt: task.expiresAt, class: task.class },
        status,
        onTime,
        submission: sub ? { id: sub.id, grade: sub.grade, gradedAt: sub.gradedAt, createdAt: sub.createdAt } : null
      }
    })

    const summary = {
      total: items.length,
      submitted: items.filter((i) => i.status === 'submitted').length,
      pending: items.filter((i) => i.status === 'pending').length,
      expired: items.filter((i) => i.status === 'expired').length,
      onTime: items.filter((i) => i.onTime === true).length,
      late: items.filter((i) => i.onTime === false).length,
      graded: items.filter((i) => i.submission?.grade != null).length,
      totalEarned: items.reduce((sum, i) => sum + (i.submission?.grade ?? 0), 0),
      totalPossible: items.reduce((sum, i) => sum + i.task.score, 0)
    }

    return { summary, tasks: items }
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
