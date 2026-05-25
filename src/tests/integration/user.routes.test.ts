import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { getTestApp, bearerHeader } from '@/tests/helpers/app'
import { cleanDatabase } from '@/tests/helpers/database'
import { seedAdmin, seedTeacher, seedStudent, DEFAULT_PASSWORD } from '@/tests/helpers/fixtures'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await app.close() })
afterEach(async () => { await cleanDatabase() })

describe('POST /users', () => {
  it('returns 201 with created user for admin', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { name: 'New User', email: 'new@test.com', password: 'Password1', role: 'student' }
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ email: 'new@test.com', role: 'student' })
    expect(res.json()).not.toHaveProperty('password')
  })

  it('returns 401 when no token provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      payload: { name: 'X', email: 'x@x.com', password: 'pass123', role: 'student' }
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 403 when requester is teacher', async () => {
    const teacher = await seedTeacher()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: bearerHeader(app, { sub: teacher.id, role: 'teacher' }),
      payload: { name: 'X', email: 'x@x.com', password: 'pass123', role: 'student' }
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when requester is student', async () => {
    const student = await seedStudent()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: bearerHeader(app, { sub: student.id, role: 'student' }),
      payload: { name: 'X', email: 'x@x.com', password: 'pass123', role: 'student' }
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('GET /users/me', () => {
  it('returns 200 with the authenticated user data', async () => {
    const student = await seedStudent()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: bearerHeader(app, { sub: student.id, role: 'student' })
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: student.id, email: student.email })
    expect(res.json()).not.toHaveProperty('password')
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users/me' })

    expect(res.statusCode).toBe(401)
  })
})

describe('GET /users', () => {
  it('returns 200 with array of users for authenticated requester', async () => {
    const admin = await seedAdmin()
    await seedStudent()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users' })

    expect(res.statusCode).toBe(401)
  })

  it('does not expose password field in any user', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    const users = res.json() as Array<Record<string, unknown>>
    for (const user of users) {
      expect(user).not.toHaveProperty('password')
    }
  })
})

describe('GET /users/:id', () => {
  it('returns 200 with user for valid id', async () => {
    const admin = await seedAdmin()
    const student = await seedStudent()

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${student.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: student.id })
  })

  it('returns 404 for non-existent id', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/non-existent-id',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users/any-id' })

    expect(res.statusCode).toBe(401)
  })
})

describe('PATCH /users/:id', () => {
  it('returns 200 with updated user', async () => {
    const admin = await seedAdmin()
    const student = await seedStudent()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${student.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { name: 'Updated Name' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ name: 'Updated Name' })
  })

  it('updates password so new password works for login', async () => {
    const admin = await seedAdmin()
    const student = await seedStudent({ email: 'pw-update@test.com' })

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${student.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { password: 'BrandNew99' }
    })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: student.email, password: 'BrandNew99' }
    })
    expect(loginRes.statusCode).toBe(200)
  })

  it('returns 404 for non-existent id', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/non-existent',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { name: 'New Name' }
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /users/:id', () => {
  it('returns 204 and user no longer accessible afterwards', async () => {
    const admin = await seedAdmin()
    const student = await seedStudent()

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${student.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(deleteRes.statusCode).toBe(204)

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${student.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })
    expect(getRes.statusCode).toBe(404)
  })

  it('returns 404 for non-existent id', async () => {
    const admin = await seedAdmin()

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/non-existent',
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' })
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/users/any' })

    expect(res.statusCode).toBe(401)
  })
})

describe('auth: old password no longer works after update', () => {
  it('returns 401 when logging in with old password after change', async () => {
    const admin = await seedAdmin()
    const student = await seedStudent({ email: 'old-pw@test.com', password: DEFAULT_PASSWORD })

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${student.id}`,
      headers: bearerHeader(app, { sub: admin.id, role: 'admin' }),
      payload: { password: 'CompletelyNew99' }
    })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: student.email, password: DEFAULT_PASSWORD }
    })
    expect(loginRes.statusCode).toBe(401)
  })
})
