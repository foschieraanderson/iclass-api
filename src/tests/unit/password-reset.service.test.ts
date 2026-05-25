import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUserRepo = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  update: vi.fn()
}))

const mockTokenRepo = vi.hoisted(() => ({
  invalidatePreviousTokens: vi.fn(),
  create: vi.fn(),
  findActiveByUserIdAndCode: vi.fn(),
  markAsUsed: vi.fn()
}))

vi.mock('@/repositories/user.repository', () => ({
  UserRepository: vi.fn().mockImplementation(function () { return mockUserRepo })
}))

vi.mock('@/repositories/password-reset.repository', () => ({
  PasswordResetRepository: vi.fn().mockImplementation(function () { return mockTokenRepo })
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(), compare: vi.fn() }
}))

import bcrypt from 'bcryptjs'
import { PasswordResetService } from '@/services/password-reset.service'
import type { FastifyInstance } from 'fastify'

describe('PasswordResetService', () => {
  let service: PasswordResetService
  let mockSendEmail: ReturnType<typeof vi.fn>

  const user = { id: 'u1', email: 'user@test.com', password: '$hashed', role: 'student' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail = vi.fn().mockResolvedValue(undefined)
    service = new PasswordResetService({ sendEmail: mockSendEmail } as unknown as FastifyInstance)
  })

  describe('requestPasswordReset', () => {
    it('always returns a generic message regardless of email existence', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null)

      const result = await service.requestPasswordReset({ email: 'ghost@ghost.com' })

      expect(result).toHaveProperty('message')
      expect(typeof result.message).toBe('string')
    })

    it('does not call sendEmail or create token when email not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null)

      await service.requestPasswordReset({ email: 'ghost@ghost.com' })

      expect(mockSendEmail).not.toHaveBeenCalled()
      expect(mockTokenRepo.create).not.toHaveBeenCalled()
    })

    it('invalidates previous tokens when email exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(user)
      mockTokenRepo.invalidatePreviousTokens.mockResolvedValue(undefined)
      mockTokenRepo.create.mockResolvedValue({})

      await service.requestPasswordReset({ email: user.email })

      expect(mockTokenRepo.invalidatePreviousTokens).toHaveBeenCalledWith(user.id)
    })

    it('creates a 6-digit token and sends email when email exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(user)
      mockTokenRepo.invalidatePreviousTokens.mockResolvedValue(undefined)
      mockTokenRepo.create.mockResolvedValue({})

      await service.requestPasswordReset({ email: user.email })

      expect(mockTokenRepo.create).toHaveBeenCalledWith(
        user.id,
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date)
      )
      expect(mockSendEmail).toHaveBeenCalledWith(user.email, expect.any(String), expect.any(String))
    })
  })

  describe('resetPassword', () => {
    it('throws 400 when email is not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null)

      await expect(
        service.resetPassword({ email: 'ghost@ghost.com', code: '123456', newPassword: 'newpass123' })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('throws 400 when token is not found (invalid code)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(user)
      mockTokenRepo.findActiveByUserIdAndCode.mockResolvedValue(null)

      await expect(
        service.resetPassword({ email: user.email, code: '999999', newPassword: 'newpass123' })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('marks token as used, hashes new password and updates user on success', async () => {
      const token = { id: 'tok1' }
      mockUserRepo.findByEmail.mockResolvedValue(user)
      mockTokenRepo.findActiveByUserIdAndCode.mockResolvedValue(token)
      mockTokenRepo.markAsUsed.mockResolvedValue(undefined)
      ;(bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$newHash')
      mockUserRepo.update.mockResolvedValue(undefined)

      const result = await service.resetPassword({ email: user.email, code: '123456', newPassword: 'newpass123' })

      expect(mockTokenRepo.markAsUsed).toHaveBeenCalledWith(token.id)
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10)
      expect(mockUserRepo.update).toHaveBeenCalledWith(user.id, { password: '$newHash' })
      expect(result).toHaveProperty('message')
    })
  })
})
