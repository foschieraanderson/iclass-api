import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { getTestApp, signToken } from '@/tests/helpers/app'
import { cleanDatabase } from '@/tests/helpers/database'
import { seedStudent, seedPasswordResetToken, seedExpiredPasswordResetToken, DEFAULT_PASSWORD } from '@/tests/helpers/fixtures'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await app.close() })
afterEach(async () => { await cleanDatabase() })

describe('POST /auth/login', () => {
  it('returns 200 with accessToken and refreshToken for valid credentials', async () => {
    const user = await seedStudent({ email: 'login@test.com' })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: user.email, password: DEFAULT_PASSWORD }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String)
    })
  })

  it('returns 401 for wrong password', async () => {
    const user = await seedStudent({ email: 'login2@test.com' })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: user.email, password: 'wrongpassword' }
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ghost@ghost.com', password: 'pw' }
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 400 for malformed body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'not-an-email', password: 'pw' }
    })

    expect(res.statusCode).toBe(400)
  })
})

describe('POST /auth/refresh', () => {
  it('returns 200 with new accessToken for valid refreshToken', async () => {
    const user = await seedStudent()
    const refreshToken = signToken(app, { sub: user.id, role: user.role }, { type: 'refresh' }, '7d')

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ accessToken: expect.any(String) })
  })

  it('returns 401 when given a regular access token instead of refresh', async () => {
    const user = await seedStudent()
    const accessToken = signToken(app, { sub: user.id, role: user.role })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: accessToken }
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for malformed token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'not.a.jwt' }
    })

    expect(res.statusCode).toBe(401)
  })
})

describe('POST /auth/forgot-password', () => {
  it('returns 200 with generic message when email does not exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'ghost@ghost.com' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('message')
  })

  it('returns 200 and calls sendEmail when email exists', async () => {
    const user = await seedStudent({ email: 'forgot@test.com' })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: user.email }
    })

    expect(res.statusCode).toBe(200)
    expect((app as unknown as { sendEmail: ReturnType<typeof vi.fn> }).sendEmail).toHaveBeenCalledWith(user.email, expect.any(String), expect.any(String))
  })
})

describe('POST /auth/reset-password', () => {
  it('returns 200 and allows login with new password after valid reset', async () => {
    const user = await seedStudent({ email: 'reset@test.com' })
    await seedPasswordResetToken(user.id, '111111')

    const resetRes = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { email: user.email, code: '111111', newPassword: 'NewPassword99' }
    })

    expect(resetRes.statusCode).toBe(200)

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: user.email, password: 'NewPassword99' }
    })
    expect(loginRes.statusCode).toBe(200)
  })

  it('returns 400 for invalid code', async () => {
    const user = await seedStudent({ email: 'reset2@test.com' })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { email: user.email, code: '000000', newPassword: 'NewPass99' }
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for expired token', async () => {
    const user = await seedStudent({ email: 'reset3@test.com' })
    await seedExpiredPasswordResetToken(user.id, '222222')

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { email: user.email, code: '222222', newPassword: 'NewPass99' }
    })

    expect(res.statusCode).toBe(400)
  })
})
