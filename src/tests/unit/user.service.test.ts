import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRepo = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/repositories/user.repository', () => ({
  UserRepository: vi.fn().mockImplementation(function () { return mockRepo })
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(), compare: vi.fn() }
}))

import bcrypt from 'bcryptjs'
import { UserService } from '@/services/user.service'

describe('UserService', () => {
  let service: UserService
  const publicUser = { id: 'u1', name: 'A', email: 'a@a.com', role: 'student', createdAt: new Date(), updatedAt: new Date() }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new UserService()
  })

  describe('create', () => {
    it('hashes password with salt 10 before calling repository.create', async () => {
      ;(bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$hashed')
      mockRepo.create.mockResolvedValue(publicUser)

      await service.create({ name: 'A', email: 'a@a.com', password: 'plaintext', role: 'student' })

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10)
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ password: '$hashed' }))
    })

    it('does not expose password in the returned value', async () => {
      ;(bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$hashed')
      mockRepo.create.mockResolvedValue(publicUser)

      const result = await service.create({ name: 'A', email: 'a@a.com', password: 'pw', role: 'student' })

      expect(result).not.toHaveProperty('password')
    })
  })

  describe('findAll', () => {
    it('delegates to repository.findAll', async () => {
      mockRepo.findAll.mockResolvedValue([publicUser])

      const result = await service.findAll()

      expect(result).toEqual([publicUser])
      expect(mockRepo.findAll).toHaveBeenCalledOnce()
    })
  })

  describe('findById', () => {
    it('returns the user when found', async () => {
      mockRepo.findById.mockResolvedValue(publicUser)

      const result = await service.findById('u1')

      expect(result).toEqual(publicUser)
    })

    it('throws 404 when user is not found', async () => {
      mockRepo.findById.mockResolvedValue(null)

      await expect(service.findById('missing')).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('update', () => {
    it('re-hashes password when password is present in data', async () => {
      mockRepo.findById.mockResolvedValue(publicUser)
      ;(bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$newHash')
      mockRepo.update.mockResolvedValue(publicUser)

      await service.update('u1', { password: 'newpass' })

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10)
      expect(mockRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({ password: '$newHash' }))
    })

    it('does not call bcrypt.hash when password is absent', async () => {
      mockRepo.findById.mockResolvedValue(publicUser)
      mockRepo.update.mockResolvedValue(publicUser)

      await service.update('u1', { name: 'New Name' })

      expect(bcrypt.hash).not.toHaveBeenCalled()
    })

    it('propagates 404 when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)

      await expect(service.update('missing', { name: 'X' })).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('delete', () => {
    it('calls findById then repository.delete', async () => {
      mockRepo.findById.mockResolvedValue(publicUser)
      mockRepo.delete.mockResolvedValue(undefined)

      await service.delete('u1')

      expect(mockRepo.findById).toHaveBeenCalledWith('u1')
      expect(mockRepo.delete).toHaveBeenCalledWith('u1')
    })

    it('propagates 404 when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)

      await expect(service.delete('missing')).rejects.toMatchObject({ statusCode: 404 })
      expect(mockRepo.delete).not.toHaveBeenCalled()
    })
  })
})
