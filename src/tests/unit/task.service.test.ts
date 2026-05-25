import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTaskRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdWithClass: vi.fn(),
  findAll: vi.fn(),
  findAllForStudent: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}))

const mockClassRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findAll: vi.fn()
}))

vi.mock('@/repositories/task.repository', () => ({
  TaskRepository: vi.fn().mockImplementation(function () { return mockTaskRepo })
}))

vi.mock('@/repositories/class.repository', () => ({
  ClassRepository: vi.fn().mockImplementation(function () { return mockClassRepo })
}))

import { TaskService } from '@/services/task.service'

describe('TaskService', () => {
  let service: TaskService

  const teacherId = 't1'
  const otherTeacherId = 't2'
  const studentId = 's1'

  const classObj = { id: 'c1', code: '2026/1-3A', teacher: { id: teacherId }, teacherId }
  const taskWithClass = { id: 'task1', classId: 'c1', class: { id: 'c1', teacherId } }
  const task = { id: 'task1', classId: 'c1', title: 'T', score: 5 }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TaskService()
  })

  describe('create', () => {
    it('allows admin to create task in any class without ownership check', async () => {
      mockClassRepo.findById.mockResolvedValue(classObj)
      mockTaskRepo.create.mockResolvedValue(task)

      await service.create({ classId: 'c1', title: 'T', score: 5 }, undefined, 'admin-1', 'admin')

      expect(mockTaskRepo.create).toHaveBeenCalledOnce()
    })

    it('allows teacher to create task in their own class', async () => {
      mockClassRepo.findById.mockResolvedValue(classObj)
      mockTaskRepo.create.mockResolvedValue(task)

      await service.create({ classId: 'c1', title: 'T', score: 5 }, undefined, teacherId, 'teacher')

      expect(mockTaskRepo.create).toHaveBeenCalledOnce()
    })

    it('throws 403 when teacher tries to create task in another teacher class', async () => {
      mockClassRepo.findById.mockResolvedValue(classObj)

      await expect(
        service.create({ classId: 'c1', title: 'T', score: 5 }, undefined, otherTeacherId, 'teacher')
      ).rejects.toMatchObject({ statusCode: 403 })

      expect(mockTaskRepo.create).not.toHaveBeenCalled()
    })

    it('throws 404 when class does not exist', async () => {
      mockClassRepo.findById.mockResolvedValue(null)

      await expect(
        service.create({ classId: 'c1', title: 'T', score: 5 }, undefined, teacherId, 'teacher')
      ).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('findAll', () => {
    it('calls findAllForStudent when requester is student', async () => {
      mockTaskRepo.findAllForStudent.mockResolvedValue([task])

      await service.findAll(undefined, studentId, 'student')

      expect(mockTaskRepo.findAllForStudent).toHaveBeenCalledWith(studentId, undefined)
    })

    it('passes classId to findAllForStudent when student provides it', async () => {
      mockTaskRepo.findAllForStudent.mockResolvedValue([])

      await service.findAll('c1', studentId, 'student')

      expect(mockTaskRepo.findAllForStudent).toHaveBeenCalledWith(studentId, 'c1')
    })

    it('filters to own classes only for teacher', async () => {
      mockClassRepo.findAll.mockResolvedValue([{ ...classObj, teacher: { id: teacherId } }])
      mockTaskRepo.findAll.mockResolvedValue([task])

      const result = await service.findAll(undefined, teacherId, 'teacher')

      expect(result).toEqual([task])
    })

    it('throws 403 when teacher filters by classId of another teacher', async () => {
      mockClassRepo.findAll.mockResolvedValue([{ ...classObj, teacher: { id: otherTeacherId } }])

      await expect(service.findAll('c1', teacherId, 'teacher')).rejects.toMatchObject({ statusCode: 403 })
    })
  })

  describe('update', () => {
    it('throws 404 when task does not exist', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(null)

      await expect(service.update('missing', {}, undefined, teacherId, 'teacher')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws 403 when teacher updates task from another class', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(taskWithClass)

      await expect(service.update('task1', {}, undefined, otherTeacherId, 'teacher')).rejects.toMatchObject({ statusCode: 403 })
    })

    it('allows admin to update any task', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(taskWithClass)
      mockTaskRepo.update.mockResolvedValue(task)

      await service.update('task1', { title: 'New' }, undefined, 'admin-1', 'admin')

      expect(mockTaskRepo.update).toHaveBeenCalledOnce()
    })

    it('does not include fileUrl in payload when fileUrl is undefined', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(taskWithClass)
      mockTaskRepo.update.mockResolvedValue(task)

      await service.update('task1', {}, undefined, teacherId, 'teacher')

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task1',
        expect.not.objectContaining({ fileUrl: expect.anything() })
      )
    })
  })

  describe('delete', () => {
    it('throws 404 when task does not exist', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(null)

      await expect(service.delete('missing', teacherId, 'teacher')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws 403 when teacher deletes task from another class', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(taskWithClass)

      await expect(service.delete('task1', otherTeacherId, 'teacher')).rejects.toMatchObject({ statusCode: 403 })
    })

    it('allows admin to delete any task', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(taskWithClass)
      mockTaskRepo.delete.mockResolvedValue(undefined)

      await service.delete('task1', 'admin-1', 'admin')

      expect(mockTaskRepo.delete).toHaveBeenCalledWith('task1')
    })
  })
})
