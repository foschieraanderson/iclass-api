import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRepo = vi.hoisted(() => ({ findByEmail: vi.fn() }))

vi.mock('@/repositories/user.repository', () => ({
  UserRepository: vi.fn().mockImplementation(function () { return mockRepo })
}))

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() }
}))

import bcrypt from 'bcryptjs'
import { AuthService } from '@/services/auth.service'

describe('AuthService', () => {
  let service: AuthService
  const fakeUser = { id: 'user-1', email: 'test@test.com', role: 'student', password: '$hashed' }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService()
  })

  describe('validateCredentials', () => {
    it('returns { id, email, role } without password when credentials are valid', async () => {
      mockRepo.findByEmail.mockResolvedValue(fakeUser)
      ;(bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      const result = await service.validateCredentials({ email: fakeUser.email, password: 'pw' })

      expect(result).toEqual({ id: fakeUser.id, email: fakeUser.email, role: fakeUser.role })
      expect(result).not.toHaveProperty('password')
    })

    it('throws 401 when email is not found', async () => {
      mockRepo.findByEmail.mockResolvedValue(null)

      await expect(
        service.validateCredentials({ email: 'ghost@ghost.com', password: 'pw' })
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid credentials' })
    })

    it('throws 401 when password does not match', async () => {
      mockRepo.findByEmail.mockResolvedValue(fakeUser)
      ;(bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false)

      await expect(
        service.validateCredentials({ email: fakeUser.email, password: 'wrong' })
      ).rejects.toMatchObject({ statusCode: 401 })
    })

    it('calls findByEmail with the provided email', async () => {
      mockRepo.findByEmail.mockResolvedValue(null)

      await service.validateCredentials({ email: 'x@x.com', password: 'pw' }).catch(() => {})

      expect(mockRepo.findByEmail).toHaveBeenCalledWith('x@x.com')
    })
  })
})
