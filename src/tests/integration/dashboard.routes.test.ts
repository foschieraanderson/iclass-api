import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { getTestApp, bearerHeader } from '@/tests/helpers/app'
import { cleanDatabase } from '@/tests/helpers/database'
import { seedAdmin, seedTeacher, seedStudent, seedClass, seedTask, seedSubmission } from '@/tests/helpers/fixtures'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await app.close() })
afterEach(async () => { await cleanDatabase() })

describe('GET /dashboard', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard' })

    expect(res.statusCode).toBe(401)
  })

  describe('student dashboard', () => {
    it('returns role student with tasks and score', async () => {
      const student = await seedStudent()

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: student.id, role: 'student' })
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.role).toBe('student')
      expect(body).toHaveProperty('tasks')
      expect(body).toHaveProperty('score')
    })

    it('tasks.total matches number of tasks in enrolled classes', async () => {
      const teacher = await seedTeacher()
      const student = await seedStudent()
      const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
      await seedTask({ classId: cls.id, createdById: teacher.id })
      await seedTask({ classId: cls.id, createdById: teacher.id })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: student.id, role: 'student' })
      })

      const { tasks } = res.json()
      expect(tasks.total).toBe(2)
      expect(tasks.pending).toBe(2)
      expect(tasks.submitted).toBe(0)
    })

    it('counts submitted task after student submits', async () => {
      const teacher = await seedTeacher()
      const student = await seedStudent()
      const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
      const task = await seedTask({ classId: cls.id, createdById: teacher.id })
      await seedSubmission({ taskId: task.id, studentId: student.id })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: student.id, role: 'student' })
      })

      const { tasks, score } = res.json()
      expect(tasks.submitted).toBe(1)
      expect(tasks.pending).toBe(0)
      expect(score.totalPossible).toBeGreaterThan(0)
    })
  })

  describe('teacher dashboard', () => {
    it('returns role teacher with overview and classes', async () => {
      const teacher = await seedTeacher()

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' })
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.role).toBe('teacher')
      expect(body).toHaveProperty('overview')
      expect(Array.isArray(body.classes)).toBe(true)
    })

    it('overview reflects teacher own classes', async () => {
      const teacher = await seedTeacher()
      const student1 = await seedStudent()
      const student2 = await seedStudent()
      const cls = await seedClass({ teacherId: teacher.id, studentIds: [student1.id, student2.id] })
      await seedTask({ classId: cls.id, createdById: teacher.id })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' })
      })

      const { overview, classes } = res.json()
      expect(overview.totalClasses).toBe(1)
      expect(overview.totalStudents).toBe(2)
      expect(overview.totalTasks).toBe(1)
      expect(classes).toHaveLength(1)
      expect(classes[0].studentCount).toBe(2)
      expect(classes[0].taskCount).toBe(1)
    })

    it('pendingGrades counts ungraded submissions', async () => {
      const teacher = await seedTeacher()
      const student = await seedStudent()
      const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
      const task = await seedTask({ classId: cls.id, createdById: teacher.id })
      await seedSubmission({ taskId: task.id, studentId: student.id })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' })
      })

      const { overview } = res.json()
      expect(overview.pendingGrades).toBe(1)
    })
  })

  describe('admin dashboard', () => {
    it('returns role admin with users, classes, and tasks', async () => {
      const admin = await seedAdmin()

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.role).toBe('admin')
      expect(body).toHaveProperty('users')
      expect(body).toHaveProperty('classes')
      expect(body).toHaveProperty('tasks')
    })

    it('users counts reflect seeded users', async () => {
      const admin = await seedAdmin()
      await seedTeacher()
      await seedStudent()
      await seedStudent()

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
      })

      const { users } = res.json()
      expect(users.admins).toBeGreaterThanOrEqual(1)
      expect(users.teachers).toBeGreaterThanOrEqual(1)
      expect(users.students).toBeGreaterThanOrEqual(2)
      expect(users.total).toBe(users.admins + users.teachers + users.students)
    })

    it('classes.total and tasks.total reflect seeded data', async () => {
      const admin = await seedAdmin()
      const teacher = await seedTeacher()
      const student = await seedStudent()
      const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
      await seedTask({ classId: cls.id, createdById: teacher.id })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
      })

      const { classes, tasks } = res.json()
      expect(classes.total).toBeGreaterThanOrEqual(1)
      expect(tasks.total).toBeGreaterThanOrEqual(1)
    })
  })
})
