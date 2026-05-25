import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { getTestApp, bearerHeader } from '@/tests/helpers/app'
import { cleanDatabase } from '@/tests/helpers/database'
import { seedAdmin, seedTeacher, seedStudent, seedClass } from '@/tests/helpers/fixtures'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await app.close() })
afterEach(async () => { await cleanDatabase() })

describe('POST /classes', () => {
  it('returns 201 with computed code for admin', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { period: '2026/1', grade: '3A', teacherId: teacher.id, studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ code: '2026/1-3A', period: '2026/1', grade: '3A' })
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/classes', payload: {} })

    expect(res.statusCode).toBe(401)
  })

  it('returns 403 when requester is teacher', async () => {
    const teacher = await seedTeacher()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' }),
      payload: { period: '2026/1', grade: '3A', teacherId: teacher.id, studentIds: ['s1'] }
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 422 when teacherId resolves to a student', async () => {
    const admin = await seedAdmin()
    const student = await seedStudent()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { period: '2026/1', grade: '3A', teacherId: student.id, studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 422 when a studentId resolves to a teacher', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const teacher2 = await seedTeacher()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { period: '2026/1', grade: '3A', teacherId: teacher.id, studentIds: [teacher2.id] }
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 409 when class with same code already exists', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    await seedClass({ teacherId: teacher.id, studentIds: [student.id], period: '2026/1', grade: '3A' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { period: '2026/1', grade: '3A', teacherId: teacher.id, studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(409)
  })
})

describe('GET /classes', () => {
  it('returns 200 with class list for authenticated user', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/classes',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(res.json().length).toBeGreaterThan(0)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/classes' })

    expect(res.statusCode).toBe(401)
  })
})

describe('GET /classes/:id', () => {
  it('returns 200 with class data', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/classes/${cls.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: cls.id })
  })

  it('returns 404 for non-existent id', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/classes/non-existent',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /classes/:id', () => {
  it('returns 200 and updates grade', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id], period: '2026/1', grade: '3A' })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/classes/${cls.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { grade: '4B' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ code: '2026/1-4B', grade: '4B' })
  })

  it('does not return 409 when period and grade are unchanged', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id], period: '2026/1', grade: '3A' })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/classes/${cls.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { period: '2026/1', grade: '3a' }
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 409 when new code conflicts with existing class', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    await seedClass({ teacherId: teacher.id, studentIds: [student.id], period: '2026/1', grade: '3A' })
    const cls2 = await seedClass({ teacherId: teacher.id, studentIds: [student.id], period: '2026/2', grade: '3A' })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/classes/${cls2.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { period: '2026/1' }
    })

    expect(res.statusCode).toBe(409)
  })

  it('returns 403 when requester is not admin', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/classes/${cls.id}`,
      headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' }),
      payload: { grade: '5C' }
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('DELETE /classes/:id', () => {
  it('returns 204 on success', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/classes/${cls.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 404 for non-existent id', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/classes/non-existent',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('POST /classes/:id/students', () => {
  it('returns 204 when admin adds valid students', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const existing = await seedStudent()
    const newStudent = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [existing.id] })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/classes/${cls.id}/students`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { studentIds: [newStudent.id] }
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 204 when student is already enrolled (idempotent)', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/classes/${cls.id}/students`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 404 when class does not exist', async () => {
    const admin = await seedAdmin()
    const student = await seedStudent()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/classes/non-existent/students',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 when studentId does not exist', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/classes/${cls.id}/students`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { studentIds: ['non-existent-id'] }
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 422 when user is not a student', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const teacher2 = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/classes/${cls.id}/students`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { studentIds: [teacher2.id] }
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 403 when requester is not admin', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/classes/${cls.id}/students`,
      headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' }),
      payload: { studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('DELETE /classes/:id/students', () => {
  it('returns 204 when admin removes enrolled students', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/classes/${cls.id}/students`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 204 when student is not enrolled (idempotent)', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const otherStudent = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/classes/${cls.id}/students`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { studentIds: [otherStudent.id] }
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 404 when class does not exist', async () => {
    const admin = await seedAdmin()
    const student = await seedStudent()

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/classes/non-existent/students',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when requester is not admin', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/classes/${cls.id}/students`,
      headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' }),
      payload: { studentIds: [student.id] }
    })

    expect(res.statusCode).toBe(403)
  })
})
