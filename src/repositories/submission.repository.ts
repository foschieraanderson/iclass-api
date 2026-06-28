import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { db } from '@/database/db'
import { taskSubmissions } from '@/database/schema'

const publicUserColumns = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

const submissionColumns = {
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
} as const

const submissionRelations = {
  task: {
    columns: { id: true, title: true, score: true, expiresAt: true },
    with: { class: { columns: { id: true, code: true } } },
  },
  student: { columns: publicUserColumns },
} as const

const submissionWithClassRelations = {
  task: {
    columns: { id: true, title: true, score: true, expiresAt: true, classId: true },
    with: { class: { columns: { id: true, code: true, teacherId: true } } },
  },
  student: { columns: publicUserColumns },
} as const

export class SubmissionRepository {
  async create(taskId: string, studentId: string, textAnswer?: string, fileUrl?: string) {
    const [{ id }] = await db
      .insert(taskSubmissions)
      .values({ id: uuidv7(), taskId, studentId, textAnswer, fileUrl })
      .returning({ id: taskSubmissions.id })

    return db.query.taskSubmissions.findFirst({
      where: eq(taskSubmissions.id, id),
      columns: submissionColumns,
      with: submissionRelations,
    })
  }

  async findByTaskId(taskId: string) {
    return db.query.taskSubmissions.findMany({
      where: eq(taskSubmissions.taskId, taskId),
      columns: submissionColumns,
      with: submissionRelations,
      orderBy: [asc(taskSubmissions.createdAt)],
    })
  }

  async findByStudentId(studentId: string) {
    return db.query.taskSubmissions.findMany({
      where: eq(taskSubmissions.studentId, studentId),
      columns: submissionColumns,
      with: submissionRelations,
      orderBy: [desc(taskSubmissions.createdAt)],
    })
  }

  async findById(id: string) {
    return db.query.taskSubmissions.findFirst({
      where: eq(taskSubmissions.id, id),
      columns: submissionColumns,
      with: submissionRelations,
    })
  }

  async findByIdWithClass(id: string) {
    return db.query.taskSubmissions.findFirst({
      where: eq(taskSubmissions.id, id),
      columns: submissionColumns,
      with: submissionWithClassRelations,
    })
  }

  async findByTaskAndStudent(taskId: string, studentId: string) {
    return db.query.taskSubmissions.findFirst({
      where: and(eq(taskSubmissions.taskId, taskId), eq(taskSubmissions.studentId, studentId)),
      columns: { id: true },
    })
  }

  async grade(id: string, grade: number, feedback?: string) {
    await db
      .update(taskSubmissions)
      .set({ grade, feedback, gradedAt: new Date(), updatedAt: new Date() })
      .where(eq(taskSubmissions.id, id))

    return db.query.taskSubmissions.findFirst({
      where: eq(taskSubmissions.id, id),
      columns: submissionColumns,
      with: submissionRelations,
    })
  }
}
