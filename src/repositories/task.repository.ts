import { and, desc, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { db } from '@/database/db'
import { classStudents, tasks } from '@/database/schema'

const publicUserColumns = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

const taskColumns = {
  id: true,
  classId: true,
  title: true,
  description: true,
  fileUrl: true,
  score: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const

const taskRelations = {
  class: { columns: { id: true, code: true, period: true, grade: true } },
  createdBy: { columns: publicUserColumns },
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
    const [{ id }] = await db
      .insert(tasks)
      .values({ id: uuidv7(), ...data })
      .returning({ id: tasks.id })

    return db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      columns: taskColumns,
      with: taskRelations,
    })
  }

  async findAll(classId?: string) {
    return db.query.tasks.findMany({
      where: classId ? eq(tasks.classId, classId) : undefined,
      columns: taskColumns,
      with: taskRelations,
      orderBy: [desc(tasks.createdAt)],
    })
  }

  async findAllForStudent(studentId: string, classId?: string) {
    const enrolledClassIds = db
      .select({ classId: classStudents.classId })
      .from(classStudents)
      .where(eq(classStudents.studentId, studentId))

    return db.query.tasks.findMany({
      where: (t, { and, inArray, eq: eqFn }) =>
        and(inArray(t.classId, enrolledClassIds), classId ? eqFn(t.classId, classId) : undefined),
      columns: taskColumns,
      with: taskRelations,
      orderBy: [desc(tasks.createdAt)],
    })
  }

  async findAllForStudentWithSubmissions(studentId: string) {
    const enrolledClassIds = db
      .select({ classId: classStudents.classId })
      .from(classStudents)
      .where(eq(classStudents.studentId, studentId))

    return db.query.tasks.findMany({
      where: (t, { inArray: inArrayFn }) => inArrayFn(t.classId, enrolledClassIds),
      columns: { id: true, title: true, score: true, expiresAt: true },
      with: {
        class: { columns: { id: true, code: true } },
        submissions: {
          where: (s, { eq: eqFn }) => eqFn(s.studentId, studentId),
          columns: { id: true, grade: true, gradedAt: true, createdAt: true },
        },
      },
      orderBy: [desc(tasks.createdAt)],
    })
  }

  async findById(id: string) {
    return db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      columns: taskColumns,
      with: taskRelations,
    })
  }

  async findByIdWithClass(id: string) {
    return db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      columns: taskColumns,
      with: {
        class: { columns: { id: true, code: true, period: true, grade: true, teacherId: true } },
        createdBy: { columns: publicUserColumns },
      },
    })
  }

  async update(id: string, data: UpdateTaskData) {
    await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))

    return db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      columns: taskColumns,
      with: taskRelations,
    })
  }

  async delete(id: string) {
    await db.delete(tasks).where(eq(tasks.id, id))
  }
}
