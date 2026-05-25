import { uuidv7 } from 'uuidv7'

import { prisma } from '@/database/prisma'
import { publicSelect as publicUserSelect } from '@/repositories/user.repository'

const submissionSelect = {
  id: true,
  taskId: true,
  studentId: true,
  textAnswer: true,
  fileUrl: true,
  grade: true,
  feedback: true,
  gradedAt: true,
  createdAt: true,
  updatedAt: true,
  task: {
    select: {
      id: true,
      title: true,
      score: true,
      expiresAt: true,
      class: { select: { id: true, code: true } }
    }
  },
  student: { select: publicUserSelect }
} as const

const submissionWithClassSelect = {
  ...submissionSelect,
  task: {
    select: {
      id: true,
      title: true,
      score: true,
      expiresAt: true,
      classId: true,
      class: { select: { id: true, code: true, teacherId: true } }
    }
  }
} as const

export class SubmissionRepository {
  async create(taskId: string, studentId: string, textAnswer?: string, fileUrl?: string) {
    return prisma.taskSubmission.create({
      data: { id: uuidv7(), taskId, studentId, textAnswer, fileUrl },
      select: submissionSelect
    })
  }

  async findByTaskId(taskId: string) {
    return prisma.taskSubmission.findMany({
      where: { taskId },
      select: submissionSelect,
      orderBy: { createdAt: 'asc' }
    })
  }

  async findByStudentId(studentId: string) {
    return prisma.taskSubmission.findMany({
      where: { studentId },
      select: submissionSelect,
      orderBy: { createdAt: 'desc' }
    })
  }

  async findById(id: string) {
    return prisma.taskSubmission.findUnique({ where: { id }, select: submissionSelect })
  }

  async findByIdWithClass(id: string) {
    return prisma.taskSubmission.findUnique({ where: { id }, select: submissionWithClassSelect })
  }

  async findByTaskAndStudent(taskId: string, studentId: string) {
    return prisma.taskSubmission.findUnique({
      where: { taskId_studentId: { taskId, studentId } },
      select: { id: true }
    })
  }

  async grade(id: string, grade: number, feedback?: string) {
    return prisma.taskSubmission.update({
      where: { id },
      data: { grade, feedback, gradedAt: new Date() },
      select: submissionSelect
    })
  }
}
