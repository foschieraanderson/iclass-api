import { and, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { db } from '@/database/db'
import { classStudents, classes, taskSubmissions, tasks, users } from '@/database/schema'

const publicUserColumns = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

const classColumns = {
  id: true,
  code: true,
  period: true,
  grade: true,
  createdAt: true,
  updatedAt: true,
} as const

const classRelations = {
  teacher: { columns: publicUserColumns },
  students: {
    columns: {},
    with: { student: { columns: publicUserColumns } },
  },
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

    const raw = await db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(classes)
        .values({ id: uuidv7(), ...classData })
        .returning({ id: classes.id })

      if (studentIds.length > 0) {
        await tx.insert(classStudents).values(studentIds.map((studentId) => ({ classId: id, studentId })))
      }

      return tx.query.classes.findFirst({
        where: eq(classes.id, id),
        columns: classColumns,
        with: classRelations,
      })
    })

    return mapClass(raw!)
  }

  async findAll() {
    const rows = await db.query.classes.findMany({
      columns: classColumns,
      with: classRelations,
    })
    return rows.map(mapClass)
  }

  async findById(id: string) {
    const raw = await db.query.classes.findFirst({
      where: eq(classes.id, id),
      columns: classColumns,
      with: classRelations,
    })
    if (!raw) return null
    return mapClass(raw)
  }

  async findByCode(code: string) {
    return (
      db.query.classes.findFirst({
        where: eq(classes.code, code),
        columns: { id: true, code: true },
      }) ?? null
    )
  }

  async update(id: string, data: UpdateClassData) {
    const { studentIds, ...classData } = data

    const raw = await db.transaction(async (tx) => {
      if (studentIds !== undefined) {
        await tx.delete(classStudents).where(eq(classStudents.classId, id))
        if (studentIds.length > 0) {
          await tx.insert(classStudents).values(studentIds.map((studentId) => ({ classId: id, studentId })))
        }
      }

      if (Object.keys(classData).length > 0) {
        await tx
          .update(classes)
          .set({ ...classData, updatedAt: new Date() })
          .where(eq(classes.id, id))
      }

      return tx.query.classes.findFirst({
        where: eq(classes.id, id),
        columns: classColumns,
        with: classRelations,
      })
    })

    return mapClass(raw!)
  }

  async findReport(classId: string) {
    return db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, code: true, teacherId: true },
      with: {
        tasks: {
          columns: { id: true, title: true, score: true },
          with: {
            submissions: {
              columns: { studentId: true, grade: true, gradedAt: true },
            },
          },
        },
        students: {
          columns: {},
          with: { student: { columns: publicUserColumns } },
        },
      },
    })
  }

  async addStudents(classId: string, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) return
    await db
      .insert(classStudents)
      .values(studentIds.map((studentId) => ({ classId, studentId })))
      .onConflictDoNothing()
  }

  async removeStudents(classId: string, studentIds: string[]): Promise<void> {
    await db
      .delete(classStudents)
      .where(and(eq(classStudents.classId, classId), inArray(classStudents.studentId, studentIds)))
  }

  async delete(id: string) {
    await db.delete(classes).where(eq(classes.id, id))
  }
}
