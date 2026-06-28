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
  findByIdWithClass: vi.fn(),
  findAllForStudentWithSubmissions: vi.fn()
}))

const mockDbLimit = vi.hoisted(() => vi.fn())
const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: mockDbLimit })
    })
  })
}))

vi.mock('@/repositories/submission.repository', () => ({
  SubmissionRepository: vi.fn().mockImplementation(function () { return mockSubRepo })
}))

vi.mock('@/repositories/task.repository', () => ({
  TaskRepository: vi.fn().mockImplementation(function () { return mockTaskRepo })
}))

vi.mock('@/database/db', () => ({ db: mockDb }))

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
      mockDbLimit.mockResolvedValue([])

      await expect(
        service.create('task1', 'answer', undefined, studentId)
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('throws 409 when student already has a submission for this task', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(task)
      mockDbLimit.mockResolvedValue([{ classId: 'c1' }])
      mockSubRepo.findByTaskAndStudent.mockResolvedValue({ id: 'existing' })

      await expect(
        service.create('task1', 'answer', undefined, studentId)
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('calls repository.create with correct args when all checks pass', async () => {
      mockTaskRepo.findByIdWithClass.mockResolvedValue(task)
      mockDbLimit.mockResolvedValue([{ classId: 'c1' }])
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

  describe('getStudentReport', () => {
    const future = new Date(Date.now() + 86400_000)
    const past = new Date(Date.now() - 86400_000)

    const makeTask = (id: string, score: number, expiresAt: Date | null, sub: { id: string; createdAt: Date; grade: number | null; gradedAt: Date | null } | null) => ({
      id, title: `Task ${id}`, score, expiresAt, class: { id: 'c1', code: '2026/1-3A' },
      submissions: sub ? [sub] : []
    })

    it('marks submitted + onTime when submitted before deadline', async () => {
      const subDate = new Date(past.getTime() + 1000)
      mockTaskRepo.findAllForStudentWithSubmissions.mockResolvedValue([
        makeTask('t1', 10, future, { id: 's1', createdAt: new Date(), grade: null, gradedAt: null })
      ])

      const { tasks, summary } = await service.getStudentReport('student1')

      expect(tasks[0].status).toBe('submitted')
      expect(tasks[0].onTime).toBe(true)
      expect(summary.submitted).toBe(1)
      expect(summary.onTime).toBe(1)
    })

    it('marks submitted + late when submitted after deadline', async () => {
      const deadline = new Date(Date.now() - 3600_000)
      const subDate = new Date(Date.now() - 1800_000)
      mockTaskRepo.findAllForStudentWithSubmissions.mockResolvedValue([
        makeTask('t1', 5, deadline, { id: 's1', createdAt: subDate, grade: null, gradedAt: null })
      ])

      const { tasks, summary } = await service.getStudentReport('student1')

      expect(tasks[0].status).toBe('submitted')
      expect(tasks[0].onTime).toBe(false)
      expect(summary.late).toBe(1)
    })

    it('marks submitted + onTime when task has no deadline', async () => {
      mockTaskRepo.findAllForStudentWithSubmissions.mockResolvedValue([
        makeTask('t1', 8, null, { id: 's1', createdAt: new Date(), grade: null, gradedAt: null })
      ])

      const { tasks } = await service.getStudentReport('student1')

      expect(tasks[0].status).toBe('submitted')
      expect(tasks[0].onTime).toBe(true)
    })

    it('marks pending when no submission and deadline is in the future', async () => {
      mockTaskRepo.findAllForStudentWithSubmissions.mockResolvedValue([
        makeTask('t1', 3, future, null)
      ])

      const { tasks, summary } = await service.getStudentReport('student1')

      expect(tasks[0].status).toBe('pending')
      expect(tasks[0].onTime).toBeNull()
      expect(summary.pending).toBe(1)
    })

    it('marks expired when no submission and deadline has passed', async () => {
      mockTaskRepo.findAllForStudentWithSubmissions.mockResolvedValue([
        makeTask('t1', 5, past, null)
      ])

      const { tasks, summary } = await service.getStudentReport('student1')

      expect(tasks[0].status).toBe('expired')
      expect(tasks[0].onTime).toBeNull()
      expect(summary.expired).toBe(1)
    })

    it('calculates summary counts correctly', async () => {
      const gradedAt = new Date()
      mockTaskRepo.findAllForStudentWithSubmissions.mockResolvedValue([
        makeTask('t1', 10, future, { id: 's1', createdAt: new Date(), grade: 8, gradedAt }),   // submitted, onTime, graded
        makeTask('t2', 5, past, { id: 's2', createdAt: new Date(), grade: null, gradedAt: null }),  // submitted, late (sub after deadline, same time reference)
        makeTask('t3', 3, future, null),                                                             // pending
        makeTask('t4', 8, past, null)                                                               // expired
      ])

      const { summary } = await service.getStudentReport('student1')

      expect(summary.total).toBe(4)
      expect(summary.submitted).toBe(2)
      expect(summary.pending).toBe(1)
      expect(summary.expired).toBe(1)
      expect(summary.graded).toBe(1)
      expect(summary.totalEarned).toBe(8)
      expect(summary.totalPossible).toBe(26)
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
