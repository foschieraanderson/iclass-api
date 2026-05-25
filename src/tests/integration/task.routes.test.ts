import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { getTestApp, bearerHeader } from '@/tests/helpers/app'
import { cleanDatabase } from '@/tests/helpers/database'
import { seedAdmin, seedTeacher, seedStudent, seedClass, seedTask } from '@/tests/helpers/fixtures'
import { buildMultipartBody } from '@/tests/helpers/multipart'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await app.close() })
afterEach(async () => { await cleanDatabase() })

describe('POST /tasks', () => {
  it('returns 201 for admin creating task in any class', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const { payload, contentType } = buildMultipartBody({ classId: cls.id, title: 'Task 1', score: '5' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...bearerHeader(app, { sub: admin.id, role: 'admin' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ title: 'Task 1', score: 5 })
  })

  it('returns 201 for teacher creating task in their own class', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const { payload, contentType } = buildMultipartBody({ classId: cls.id, title: 'Task 2', score: '3' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...bearerHeader(app, { sub: teacher.id, role: 'teacher' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(201)
  })

  it('returns 403 for teacher creating task in another teacher class', async () => {
    const teacher1 = await seedTeacher()
    const teacher2 = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher1.id, studentIds: [student.id] })

    const { payload, contentType } = buildMultipartBody({ classId: cls.id, title: 'T', score: '5' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...bearerHeader(app, { sub: teacher2.id, role: 'teacher' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when student tries to create task', async () => {
    const student = await seedStudent()

    const { payload, contentType } = buildMultipartBody({ classId: 'c1', title: 'T', score: '5' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...bearerHeader(app, { sub: student.id, role: 'student' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 for non-Fibonacci score', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const { payload, contentType } = buildMultipartBody({ classId: cls.id, title: 'T', score: '4' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...bearerHeader(app, { sub: admin.id, role: 'admin' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/tasks', payload: {} })

    expect(res.statusCode).toBe(401)
  })
})

describe('GET /tasks', () => {
  it('returns all tasks for admin', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    await seedTask({ classId: cls.id, createdById: teacher.id })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tasks',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBeGreaterThan(0)
  })

  it('returns only enrolled-class tasks for student', async () => {
    const teacher1 = await seedTeacher()
    const teacher2 = await seedTeacher()
    const student = await seedStudent()

    // Class where student IS enrolled
    const enrolledClass = await seedClass({ teacherId: teacher1.id, studentIds: [student.id] })
    await seedTask({ classId: enrolledClass.id, createdById: teacher1.id, title: 'Enrolled Task' })

    // Class where student is NOT enrolled
    const otherStudent = await seedStudent()
    const otherClass = await seedClass({ teacherId: teacher2.id, studentIds: [otherStudent.id], grade: '4B' })
    await seedTask({ classId: otherClass.id, createdById: teacher2.id, title: 'Other Task' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tasks',
      headers: bearerHeader(app, { sub: student.id, role: 'student' })
    })

    expect(res.statusCode).toBe(200)
    const tasks = res.json() as Array<{ title: string }>
    expect(tasks.every((t) => t.title === 'Enrolled Task')).toBe(true)
  })

  it('returns empty array for student with no enrollments', async () => {
    const student = await seedStudent()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tasks',
      headers: bearerHeader(app, { sub: student.id, role: 'student' })
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })
})

describe('GET /tasks/:id', () => {
  it('returns 200 with task for authenticated user', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks/${task.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: task.id })
  })

  it('returns 404 for non-existent task', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tasks/non-existent',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /tasks/:id', () => {
  it('returns 200 for teacher updating own class task', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })

    const { payload, contentType } = buildMultipartBody({ title: 'Updated Title', score: '8' })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${task.id}`,
      headers: { ...bearerHeader(app, { sub: teacher.id, role: 'teacher' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ title: 'Updated Title' })
  })

  it('returns 403 for teacher updating task from another class', async () => {
    const teacher1 = await seedTeacher()
    const teacher2 = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher1.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher1.id })

    const { payload, contentType } = buildMultipartBody({ title: 'X', score: '5' })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${task.id}`,
      headers: { ...bearerHeader(app, { sub: teacher2.id, role: 'teacher' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('DELETE /tasks/:id', () => {
  it('returns 204 for teacher deleting own class task', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/tasks/${task.id}`,
      headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' })
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 403 for teacher deleting task from another class', async () => {
    const teacher1 = await seedTeacher()
    const teacher2 = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher1.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher1.id })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/tasks/${task.id}`,
      headers: bearerHeader(app, { sub: teacher2.id, role: 'teacher' })
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 for non-existent task', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/tasks/non-existent',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(404)
  })
})
