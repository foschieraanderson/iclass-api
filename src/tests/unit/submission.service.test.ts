import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSubRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdWithClass: vi.fn(),
  findByTaskId: vi.fn(),
  findByStudentId: vi.fn(),
  findByTaskAndStudent: vi.fn(),
  create: vi.fn(),
  grade: vi.fn()
}))

const mockTaskRepo = vi.hoisted(() => ({
  findByIdWithClass: vi.fn()
}))

const mockPrisma = vi.hoisted(() => ({
  classStudent: { findUnique: vi.fn() }
}))

vi.mock('@/repositories/submission.repository', () => ({
  SubmissionRepository: vi.fn().mockImplementation(function () { return mockSubRepo })
}))

vi.mock('@/repositories/task.repository', () => ({
  TaskRepository: vi.fn().mockImplementation(function () { return mockTaskRepo })
}))

vi.mock('@/database/prisma', () => ({
  prisma: mockPrisma
}))

import { SubmissionService } from '@/services/submission.service'

describe('SubmissionService', () => {
  let service: SubmissionService

  const teacherId = 't1'
  const otherTeacherId = 't2'
  const studentId = 's1'
  const otherStudentId = 's2'

  const task = { id: 'task1', classId: 'c1', class: { id: 'c1', teacherId } }
  const submission = { id: 'sub1', studentId, task: { class: { teacherId } } }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SubmissionService()
  })

  describe('create', () => {
    it('throws 400 when neither textAnswer nor fileUrl is provided', async () => {
      await expect(
        service.create('task1', undefined, undefined, studentId)
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('throws 404 when task does not exist', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(null)

      await expect(
        service.create('missing', 'answer', undefined, studentId)
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws 403 when student is not enrolled in the task class', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(task)
      mockPrisma.classStudent.findUnique.mockResolvedValue(null)

      await expect(
        service.create('task1', 'answer', undefined, studentId)
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('throws 409 when student already has a submission for this task', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(task)
      mockPrisma.classStudent.findUnique.mockResolvedValue({ classId: 'c1', studentId })
      mockSubRepo.findByTaskAndStudent.mockResolvedValue({ id: 'existing' })

      await expect(
        service.create('task1', 'answer', undefined, studentId)
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('calls repository.create with correct args when all checks pass', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(task)
      mockPrisma.classStudent.findUnique.mockResolvedValue({ classId: 'c1', studentId })
      mockSubRepo.findByTaskAndStudent.mockResolvedValue(null)
      mockSubRepo.create.mockResolvedValue({ id: 'sub1' })

      await service.create('task1', 'my answer', undefined, studentId)

      expect(mockSubRepo.create).toHaveBeenCalledWith('task1', studentId, 'my answer', undefined)
    })
  })

  describe('findByTask', () => {
    it('throws 404 when task does not exist', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(null)

      await expect(service.findByTask('missing', teacherId, 'teacher')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws 403 when teacher requests submissions for another class', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(task)

      await expect(service.findByTask('task1', otherTeacherId, 'teacher')).rejects.toMatchObject({ statusCode: 403 })
    })

    it('returns submissions for teacher of the class', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(task)
      mockSubRepo.findByTaskId.mockResolvedValue([submission])

      const result = await service.findByTask('task1', teacherId, 'teacher')

      expect(result).toEqual([submission])
    })
  })

  describe('findById', () => {
    it('throws 404 when submission does not exist', async () => {
      mockSubRepo.findByIdWithClass.mockResolvedValue(null)

      await expect(service.findById('missing', studentId, 'student')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws 403 when student views another student submission', async () => {
      mockSubRepo.findByIdWithClass.mockResolvedValue({ ...submission, studentId: otherStudentId })

      await expect(service.findById('sub1', studentId, 'student')).rejects.toMatchObject({ statusCode: 403 })
    })

    it('allows student to view their own submission', async () => {
      mockSubRepo.findByIdWithClass.mockResolvedValue(submission)
      mockSubRepo.findById.mockResolvedValue(submission)

      const result = await service.findById('sub1', studentId, 'student')

      expect(result).toEqual(submission)
    })

    it('throws 403 when teacher views submission from another class', async () => {
      mockSubRepo.findByIdWithClass.mockResolvedValue(submission)

      await expect(service.findById('sub1', otherTeacherId, 'teacher')).rejects.toMatchObject({ statusCode: 403 })
    })
  })

  describe('grade', () => {
    it('throws 404 when submission does not exist', async () => {
      mockSubRepo.findByIdWithClass.mockResolvedValue(null)

      await expect(
        service.grade('missing', { grade: 80 }, teacherId, 'teacher')
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws 403 when teacher grades submission from another class', async () => {
      mockSubRepo.findByIdWithClass.mockResolvedValue(submission)

      await expect(
        service.grade('sub1', { grade: 80 }, otherTeacherId, 'teacher')
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('calls repository.grade with correct args for authorized teacher', async () => {
      mockSubRepo.findByIdWithClass.mockResolvedValue(submission)
      mockSubRepo.grade.mockResolvedValue({ ...submission, grade: 90, feedback: 'Good' })

      await service.grade('sub1', { grade: 90, feedback: 'Good' }, teacherId, 'teacher')

      expect(mockSubRepo.grade).toHaveBeenCalledWith('sub1', 90, 'Good')
    })
  })
})
