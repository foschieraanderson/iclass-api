import { uuidv7 } from 'uuidv7'

import { prisma } from '@/database/prisma'
import { publicSelect as publicUserSelect } from '@/repositories/user.repository'

const taskSelect = {
  id: true,
  classId: true,
  title: true,
  description: true,
  fileUrl: true,
  score: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  class: { select: { id: true, code: true, period: true, grade: true } },
  createdBy: { select: publicUserSelect }
} as const

export interface CreateTaskData {
  classId: string
  createdById: string
  title: string
  description?: string
  fileUrl?: string
  score: number
  expiresAt?: Date
}

export interface UpdateTaskData {
  title?: string
  description?: string
  fileUrl?: string
  score?: number
  expiresAt?: Date
}

export class TaskRepository {
  async create(data: CreateTaskData) {
    return prisma.task.create({
      data: { id: uuidv7(), ...data },
      select: taskSelect
    })
  }

  async findAll(classId?: string) {
    return prisma.task.findMany({
      where: classId ? { classId } : undefined,
      select: taskSelect,
      orderBy: { createdAt: 'desc' }
    })
  }

  async findAllForStudent(studentId: string, classId?: string) {
    return prisma.task.findMany({
      where: {
        ...(classId ? { classId } : {}),
        class: { students: { some: { studentId } } }
      },
      select: taskSelect,
      orderBy: { createdAt: 'desc' }
    })
  }

  async findById(id: string) {
    return prisma.task.findUnique({ where: { id }, select: taskSelect })
  }

  async findByIdWithClass(id: string) {
    return prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        classId: true,
        title: true,
        description: true,
        fileUrl: true,
        score: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        class: { select: { id: true, code: true, period: true, grade: true, teacherId: true } },
        createdBy: { select: publicUserSelect }
      }
    })
  }

  async update(id: string, data: UpdateTaskData) {
    return prisma.task.update({
      where: { id },
      data,
      select: taskSelect
    })
  }

  async delete(id: string) {
    await prisma.task.delete({ where: { id } })
  }
}
