import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { getTestApp, bearerHeader } from '@/tests/helpers/app'
import { cleanDatabase } from '@/tests/helpers/database'
import { seedAdmin, seedTeacher, seedStudent, seedClass, seedTask, seedSubmission } from '@/tests/helpers/fixtures'
import { buildMultipartBody } from '@/tests/helpers/multipart'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await app.close() })
afterEach(async () => { await cleanDatabase() })

describe('POST /tasks/:taskId/submissions', () => {
  it('returns 201 for enrolled student with textAnswer', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })

    const { payload, contentType } = buildMultipartBody({ textAnswer: 'My answer' })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/submissions`,
      headers: { ...bearerHeader(app, { sub: student.id, role: 'student' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ textAnswer: 'My answer', studentId: student.id })
  })

  it('returns 403 when student is not enrolled in the task class', async () => {
    const teacher = await seedTeacher()
    const enrolledStudent = await seedStudent()
    const unenrolledStudent = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [enrolledStudent.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })

    const { payload, contentType } = buildMultipartBody({ textAnswer: 'Answer' })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/submissions`,
      headers: { ...bearerHeader(app, { sub: unenrolledStudent.id, role: 'student' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when no textAnswer and no file provided', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })

    const { payload, contentType } = buildMultipartBody({})

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/submissions`,
      headers: { ...bearerHeader(app, { sub: student.id, role: 'student' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 409 when student already submitted for this task', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })
    await seedSubmission({ taskId: task.id, studentId: student.id, textAnswer: 'First answer' })

    const { payload, contentType } = buildMultipartBody({ textAnswer: 'Second answer' })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/submissions`,
      headers: { ...bearerHeader(app, { sub: student.id, role: 'student' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(409)
  })

  it('returns 404 when task does not exist', async () => {
    const student = await seedStudent()

    const { payload, contentType } = buildMultipartBody({ textAnswer: 'Answer' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks/non-existent/submissions',
      headers: { ...bearerHeader(app, { sub: student.id, role: 'student' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when role is teacher', async () => {
    const teacher = await seedTeacher()

    const { payload, contentType } = buildMultipartBody({ textAnswer: 'Answer' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks/any-task/submissions',
      headers: { ...bearerHeader(app, { sub: teacher.id, role: 'teacher' }), 'content-type': contentType },
      payload
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('GET /tasks/:taskId/submissions', () => {
  it('returns 200 with submissions list for teacher of the class', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })
    await seedSubmission({ taskId: task.id, studentId: student.id })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks/${task.id}/submissions`,
      headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' })
    })

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(res.json().length).toBe(1)
  })

  it('returns 403 for teacher of a different class', async () => {
    const teacher1 = await seedTeacher()
    const teacher2 = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher1.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher1.id })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks/${task.id}/submissions`,
      headers: bearerHeader(app, { sub: teacher2.id, role: 'teacher' })
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 200 for admin regardless of class', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks/${task.id}/submissions`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(200)
  })
})

describe('GET /submissions/mine', () => {
  it('returns only the authenticated student own submissions', async () => {
    const teacher = await seedTeacher()
    const student1 = await seedStudent()
    const student2 = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student1.id, student2.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })
    await seedSubmission({ taskId: task.id, studentId: student1.id, textAnswer: 'S1 answer' })
    await seedSubmission({ taskId: task.id, studentId: student2.id, textAnswer: 'S2 answer' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/submissions/mine',
      headers: bearerHeader(app, { sub: student1.id, role: 'student' })
    })

    expect(res.statusCode).toBe(200)
    const subs = res.json() as Array<{ studentId: string }>
    expect(subs.every((s) => s.studentId === student1.id)).toBe(true)
  })

  it('returns empty array when student has no submissions', async () => {
    const student = await seedStudent()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/submissions/mine',
      headers: bearerHeader(app, { sub: student.id, role: 'student' })
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/submissions/mine' })

    expect(res.statusCode).toBe(401)
  })
})

describe('GET /submissions/:id', () => {
  it('returns 200 for the submitting student', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })
    const sub = await seedSubmission({ taskId: task.id, studentId: student.id })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/submissions/${sub.id}`,
      headers: bearerHeader(app, { sub: student.id, role: 'student' })
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: sub.id })
  })

  it('returns 403 when student views another student submission', async () => {
    const teacher = await seedTeacher()
    const student1 = await seedStudent()
    const student2 = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student1.id, student2.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })
    const sub = await seedSubmission({ taskId: task.id, studentId: student1.id })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/submissions/${sub.id}`,
      headers: bearerHeader(app, { sub: student2.id, role: 'student' })
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 for non-existent submission', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/submissions/non-existent',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /submissions/:id (grade)', () => {
  it('returns 200 with grade and gradedAt set for teacher of the class', async () => {
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })
    const sub = await seedSubmission({ taskId: task.id, studentId: student.id })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/submissions/${sub.id}`,
      headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' }),
      payload: { grade: 85, feedback: 'Good work!' }
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.grade).toBe(85)
    expect(body.feedback).toBe('Good work!')
    expect(body.gradedAt).not.toBeNull()
  })

  it('returns 403 for teacher of a different class', async () => {
    const teacher1 = await seedTeacher()
    const teacher2 = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher1.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher1.id })
    const sub = await seedSubmission({ taskId: task.id, studentId: student.id })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/submissions/${sub.id}`,
      headers: bearerHeader(app, { sub: teacher2.id, role: 'teacher' }),
      payload: { grade: 70 }
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 200 for admin grading any submission', async () => {
    const admin = await seedAdmin()
    const teacher = await seedTeacher()
    const student = await seedStudent()
    const cls = await seedClass({ teacherId: teacher.id, studentIds: [student.id] })
    const task = await seedTask({ classId: cls.id, createdById: teacher.id })
    const sub = await seedSubmission({ taskId: task.id, studentId: student.id })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/submissions/${sub.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { grade: 100 }
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 when student tries to grade', async () => {
    const student = await seedStudent()

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/submissions/any',
      headers: bearerHeader(app, { sub: student.id, role: 'student' }),
      payload: { grade: 50 }
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/submissions/any',
      payload: { grade: 50 }
    })

    expect(res.statusCode).toBe(401)
  })
})
