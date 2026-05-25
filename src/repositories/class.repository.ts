import { uuidv7 } from 'uuidv7'

import { prisma } from '@/database/prisma'
import { publicSelect as publicUserSelect } from '@/repositories/user.repository'

const classSelect = {
  id: true,
  code: true,
  period: true,
  grade: true,
  teacher: { select: publicUserSelect },
  students: { select: { student: { select: publicUserSelect } } },
  createdAt: true,
  updatedAt: true
} as const

function mapClass<T extends { students: Array<{ student: S }>; [k: string]: unknown }, S>(raw: T) {
  return { ...raw, students: raw.students.map((cs) => cs.student) }
}

export interface CreateClassData {
  code: string
  period: string
  grade: string
  teacherId: string
  studentIds: string[]
}

export interface UpdateClassData {
  code?: string
  period?: string
  grade?: string
  teacherId?: string
  studentIds?: string[]
}

export class ClassRepository {
  async create(data: CreateClassData) {
    const { studentIds, ...classData } = data
    const raw = await prisma.class.create({
      data: {
        id: uuidv7(),
        ...classData,
        students: {
          create: studentIds.map((studentId) => ({ studentId }))
        }
      },
      select: classSelect
    })
    return mapClass(raw)
  }

  async findAll() {
    const rows = await prisma.class.findMany({ select: classSelect })
    return rows.map(mapClass)
  }

  async findById(id: string) {
    const raw = await prisma.class.findUnique({ where: { id }, select: classSelect })
    if (!raw) return null
    return mapClass(raw)
  }

  async findByCode(code: string) {
    return prisma.class.findUnique({ where: { code }, select: { id: true, code: true } })
  }

  async update(id: string, data: UpdateClassData) {
    const { studentIds, ...classData } = data

    return prisma.$transaction(async (tx) => {
      if (studentIds !== undefined) {
        await tx.classStudent.deleteMany({ where: { classId: id } })
        await tx.classStudent.createMany({
          data: studentIds.map((studentId) => ({ classId: id, studentId }))
        })
      }

      const raw = await tx.class.update({
        where: { id },
        data: classData,
        select: classSelect
      })

      return mapClass(raw)
    })
  }

  async findReport(classId: string) {
    return prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        code: true,
        teacherId: true,
        tasks: {
          select: {
            id: true,
            title: true,
            score: true,
            submissions: {
              select: { studentId: true, grade: true, gradedAt: true }
            }
          }
        },
        students: {
          select: { student: { select: publicUserSelect } }
        }
      }
    })
  }

  async addStudents(classId: string, studentIds: string[]): Promise<void> {
    await prisma.classStudent.createMany({
      data: studentIds.map((studentId) => ({ classId, studentId })),
      skipDuplicates: true
    })
  }

  async removeStudents(classId: string, studentIds: string[]): Promise<void> {
    await prisma.classStudent.deleteMany({
      where: { classId, studentId: { in: studentIds } }
    })
  }

  async delete(id: string) {
    await prisma.class.delete({ where: { id } })
  }
}
