import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClassRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByCode: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}))

const mockUserRepo = vi.hoisted(() => ({
  findById: vi.fn()
}))

vi.mock('@/repositories/class.repository', () => ({
  ClassRepository: vi.fn().mockImplementation(function () { return mockClassRepo })
}))

vi.mock('@/repositories/user.repository', () => ({
  UserRepository: vi.fn().mockImplementation(function () { return mockUserRepo })
}))

import { ClassService } from '@/services/class.service'

describe('ClassService', () => {
  let service: ClassService

  const teacher = { id: 't1', email: 'teacher@t.com', role: 'teacher', name: 'T', createdAt: new Date(), updatedAt: new Date() }
  const student = { id: 's1', email: 'student@s.com', role: 'student', name: 'S', createdAt: new Date(), updatedAt: new Date() }
  const existingClass = { id: 'c1', code: '2026/1-3A', period: '2026/1', grade: '3A', teacher, students: [] }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ClassService()
  })

  describe('create', () => {
    it('creates class with computed code "2026/1-3A" from period + grade', async () => {
      mockUserRepo.findById.mockResolvedValueOnce(teacher).mockResolvedValueOnce(student)
      mockClassRepo.findByCode.mockResolvedValue(null)
      mockClassRepo.create.mockResolvedValue(existingClass)

      await service.create({ period: '2026/1', grade: '3A', teacherId: 't1', studentIds: ['s1'] })

      expect(mockClassRepo.create).toHaveBeenCalledWith(expect.objectContaining({ code: '2026/1-3A' }))
    })

    it('throws 422 when teacherId resolves to a student role', async () => {
      mockUserRepo.findById.mockResolvedValue(student)

      await expect(
        service.create({ period: '2026/1', grade: '3A', teacherId: 's1', studentIds: ['s1'] })
      ).rejects.toMatchObject({ statusCode: 422 })
    })

    it('throws 404 when teacherId does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(null)

      await expect(
        service.create({ period: '2026/1', grade: '3A', teacherId: 'missing', studentIds: ['s1'] })
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws 422 when a studentId resolves to a teacher role', async () => {
      mockUserRepo.findById.mockResolvedValueOnce(teacher).mockResolvedValueOnce(teacher)

      await expect(
        service.create({ period: '2026/1', grade: '3A', teacherId: 't1', studentIds: ['t2'] })
      ).rejects.toMatchObject({ statusCode: 422 })
    })

    it('throws 409 when a class with the same code already exists', async () => {
      mockUserRepo.findById.mockResolvedValueOnce(teacher).mockResolvedValueOnce(student)
      mockClassRepo.findByCode.mockResolvedValue(existingClass)

      await expect(
        service.create({ period: '2026/1', grade: '3A', teacherId: 't1', studentIds: ['s1'] })
      ).rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('update', () => {
    it('does NOT call findByCode when period and grade are unchanged', async () => {
      mockClassRepo.findById.mockResolvedValue(existingClass)
      mockClassRepo.update.mockResolvedValue(existingClass)

      await service.update('c1', { period: '2026/1', grade: '3a' })

      expect(mockClassRepo.findByCode).not.toHaveBeenCalled()
    })

    it('checks code uniqueness when grade changes', async () => {
      mockClassRepo.findById.mockResolvedValue(existingClass)
      mockClassRepo.findByCode.mockResolvedValue(null)
      mockClassRepo.update.mockResolvedValue({ ...existingClass, code: '2026/1-4B', grade: '4B' })

      await service.update('c1', { grade: '4B' })

      expect(mockClassRepo.findByCode).toHaveBeenCalledWith('2026/1-4B')
    })

    it('throws 409 when updated code conflicts with another class', async () => {
      mockClassRepo.findById.mockResolvedValue(existingClass)
      mockClassRepo.findByCode.mockResolvedValue({ id: 'c2', code: '2026/1-4B' })

      await expect(service.update('c1', { grade: '4B' })).rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('findById', () => {
    it('returns the class when found', async () => {
      mockClassRepo.findById.mockResolvedValue(existingClass)

      const result = await service.findById('c1')

      expect(result).toEqual(existingClass)
    })

    it('throws 404 when class is not found', async () => {
      mockClassRepo.findById.mockResolvedValue(null)

      await expect(service.findById('missing')).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('delete', () => {
    it('throws 404 when class does not exist', async () => {
      mockClassRepo.findById.mockResolvedValue(null)

      await expect(service.delete('missing')).rejects.toMatchObject({ statusCode: 404 })
      expect(mockClassRepo.delete).not.toHaveBeenCalled()
    })

    it('calls repository.delete with correct id', async () => {
      mockClassRepo.findById.mockResolvedValue(existingClass)
      mockClassRepo.delete.mockResolvedValue(undefined)

      await service.delete('c1')

      expect(mockClassRepo.delete).toHaveBeenCalledWith('c1')
    })
  })
})
