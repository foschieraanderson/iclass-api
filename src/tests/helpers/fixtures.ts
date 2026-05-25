import bcrypt from 'bcryptjs'
import { uuidv7 } from 'uuidv7'

import { prisma } from '@/database/prisma'

export const DEFAULT_PASSWORD = 'Password123'

interface SeedUserOptions {
  name?: string
  email?: string
  password?: string
  role?: 'admin' | 'teacher' | 'student'
}

export async function seedUser(opts: SeedUserOptions = {}) {
  return prisma.user.create({
    data: {
      id: uuidv7(),
      name: opts.name ?? 'Test User',
      email: opts.email ?? `user-${uuidv7()}@test.com`,
      password: await bcrypt.hash(opts.password ?? DEFAULT_PASSWORD, 10),
      role: opts.role ?? 'student'
    }
  })
}

export async function seedAdmin(overrides: SeedUserOptions = {}) {
  return seedUser({ role: 'admin', name: 'Admin User', email: `admin-${uuidv7()}@test.com`, ...overrides })
}

export async function seedTeacher(overrides: SeedUserOptions = {}) {
  return seedUser({ role: 'teacher', name: 'Teacher User', email: `teacher-${uuidv7()}@test.com`, ...overrides })
}

export async function seedStudent(overrides: SeedUserOptions = {}) {
  return seedUser({ role: 'student', name: 'Student User', email: `student-${uuidv7()}@test.com`, ...overrides })
}

interface SeedClassOptions {
  teacherId: string
  studentIds: string[]
  period?: string
  grade?: string
}

export async function seedClass(opts: SeedClassOptions) {
  const period = opts.period ?? '2026/1'
  const grade = (opts.grade ?? '3A').toUpperCase()
  const code = `${period}-${grade}`

  return prisma.class.create({
    data: {
      id: uuidv7(),
      code,
      period,
      grade,
      teacherId: opts.teacherId,
      students: {
        create: opts.studentIds.map((studentId) => ({ studentId }))
      }
    }
  })
}

interface SeedTaskOptions {
  classId: string
  createdById: string
  title?: string
  score?: number
  expiresAt?: Date
}

export async function seedTask(opts: SeedTaskOptions) {
  return prisma.task.create({
    data: {
      id: uuidv7(),
      classId: opts.classId,
      createdById: opts.createdById,
      title: opts.title ?? 'Test Task',
      score: opts.score ?? 5,
      expiresAt: opts.expiresAt
    }
  })
}

interface SeedSubmissionOptions {
  taskId: string
  studentId: string
  textAnswer?: string
  grade?: number
  feedback?: string
}

export async function seedSubmission(opts: SeedSubmissionOptions) {
  return prisma.taskSubmission.create({
    data: {
      id: uuidv7(),
      taskId: opts.taskId,
      studentId: opts.studentId,
      textAnswer: opts.textAnswer ?? 'Test answer',
      grade: opts.grade,
      feedback: opts.feedback,
      gradedAt: opts.grade !== undefined ? new Date() : undefined
    }
  })
}

export async function seedPasswordResetToken(userId: string, code = '123456', minutesValid = 15) {
  return prisma.passwordResetToken.create({
    data: {
      id: uuidv7(),
      userId,
      code,
      expiresAt: new Date(Date.now() + minutesValid * 60 * 1000)
    }
  })
}

export async function seedExpiredPasswordResetToken(userId: string, code = '000000') {
  return prisma.passwordResetToken.create({
    data: {
      id: uuidv7(),
      userId,
      code,
      expiresAt: new Date(Date.now() - 1000)
    }
  })
}
