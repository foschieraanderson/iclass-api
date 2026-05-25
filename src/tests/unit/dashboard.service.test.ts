import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRepo = vi.hoisted(() => ({
  findStudentTasksWithSubmissions: vi.fn(),
  findTeacherClassesWithStats: vi.fn(),
  getAdminStats: vi.fn()
}))

vi.mock('@/repositories/dashboard.repository', () => ({
  DashboardRepository: vi.fn().mockImplementation(function () { return mockRepo })
}))

import { DashboardService } from '@/services/dashboard.service'

describe('DashboardService', () => {
  let service: DashboardService

  const future = new Date(Date.now() + 86400_000)
  const past = new Date(Date.now() - 86400_000)

  const makeTask = (score: number, expiresAt: Date | null, grade: number | null, hasSubmission: boolean) => ({
    score,
    expiresAt,
    submissions: hasSubmission
      ? [{ grade, gradedAt: grade != null ? new Date() : null, createdAt: new Date() }]
      : []
  })

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService()
  })

  describe('getForStudent', () => {
    it('counts submitted task correctly', async () => {
      mockRepo.findStudentTasksWithSubmissions.mockResolvedValue([
        makeTask(10, future, null, true)
      ])

      const { tasks } = await service.getForStudent('s1')

      expect(tasks.submitted).toBe(1)
      expect(tasks.pending).toBe(0)
      expect(tasks.expired).toBe(0)
    })

    it('counts pending task when no submission and deadline in future', async () => {
      mockRepo.findStudentTasksWithSubmissions.mockResolvedValue([
        makeTask(5, future, null, false)
      ])

      const { tasks } = await service.getForStudent('s1')

      expect(tasks.pending).toBe(1)
      expect(tasks.submitted).toBe(0)
    })

    it('counts expired task when no submission and deadline passed', async () => {
      mockRepo.findStudentTasksWithSubmissions.mockResolvedValue([
        makeTask(5, past, null, false)
      ])

      const { tasks } = await service.getForStudent('s1')

      expect(tasks.expired).toBe(1)
    })

    it('calculates totalEarned and totalPossible correctly', async () => {
      mockRepo.findStudentTasksWithSubmissions.mockResolvedValue([
        makeTask(10, future, 8, true),
        makeTask(5, future, null, false)
      ])

      const { score } = await service.getForStudent('s1')

      expect(score.totalEarned).toBe(8)
      expect(score.totalPossible).toBe(15)
      expect(score.graded).toBeUndefined()
    })

    it('returns average 0 when no tasks are graded', async () => {
      mockRepo.findStudentTasksWithSubmissions.mockResolvedValue([
        makeTask(10, future, null, true)
      ])

      const { score } = await service.getForStudent('s1')

      expect(score.average).toBe(0)
    })

    it('calculates average correctly when graded tasks exist', async () => {
      mockRepo.findStudentTasksWithSubmissions.mockResolvedValue([
        makeTask(10, future, 8, true),
        makeTask(5, future, 4, true)
      ])

      const { tasks, score } = await service.getForStudent('s1')

      expect(tasks.graded).toBe(2)
      expect(score.average).toBe(6)
    })

    it('returns role: student', async () => {
      mockRepo.findStudentTasksWithSubmissions.mockResolvedValue([])

      const result = await service.getForStudent('s1')

      expect(result.role).toBe('student')
    })
  })

  describe('getForTeacher', () => {
    const makeClass = (id: string, students: number, tasks: number, pendingSubs: number) => ({
      id,
      code: `2026/1-${id}`,
      period: '2026/1',
      grade: id,
      _count: { students, tasks },
      tasks: Array.from({ length: pendingSubs }, () => ({ submissions: [{ id: 's' }] }))
    })

    it('returns role: teacher', async () => {
      mockRepo.findTeacherClassesWithStats.mockResolvedValue([])

      const result = await service.getForTeacher('t1')

      expect(result.role).toBe('teacher')
    })

    it('builds overview from class stats', async () => {
      mockRepo.findTeacherClassesWithStats.mockResolvedValue([
        makeClass('3A', 10, 3, 2),
        makeClass('4B', 5, 2, 0)
      ])

      const { overview } = await service.getForTeacher('t1')

      expect(overview.totalClasses).toBe(2)
      expect(overview.totalStudents).toBe(15)
      expect(overview.totalTasks).toBe(5)
      expect(overview.pendingGrades).toBe(2)
    })

    it('maps each class with pendingGrades as submission count without grade', async () => {
      mockRepo.findTeacherClassesWithStats.mockResolvedValue([
        makeClass('3A', 8, 4, 3)
      ])

      const { classes } = await service.getForTeacher('t1')

      expect(classes).toHaveLength(1)
      expect(classes[0].pendingGrades).toBe(3)
      expect(classes[0].studentCount).toBe(8)
      expect(classes[0].taskCount).toBe(4)
    })
  })

  describe('getForAdmin', () => {
    it('returns role: admin', async () => {
      mockRepo.getAdminStats.mockResolvedValue({
        userCounts: [],
        totalClasses: 0,
        totalTasks: 0,
        totalSubmissions: 0,
        pendingGrades: 0
      })

      const result = await service.getForAdmin()

      expect(result.role).toBe('admin')
    })

    it('builds users object from groupBy result', async () => {
      mockRepo.getAdminStats.mockResolvedValue({
        userCounts: [
          { role: 'admin', _count: { id: 1 } },
          { role: 'teacher', _count: { id: 4 } },
          { role: 'student', _count: { id: 20 } }
        ],
        totalClasses: 8,
        totalTasks: 30,
        totalSubmissions: 95,
        pendingGrades: 20
      })

      const { users, classes, tasks } = await service.getForAdmin()

      expect(users.total).toBe(25)
      expect(users.admins).toBe(1)
      expect(users.teachers).toBe(4)
      expect(users.students).toBe(20)
      expect(classes.total).toBe(8)
      expect(tasks.total).toBe(30)
      expect(tasks.submissions).toBe(95)
      expect(tasks.pendingGrades).toBe(20)
    })

    it('defaults missing roles to 0 when groupBy returns fewer entries', async () => {
      mockRepo.getAdminStats.mockResolvedValue({
        userCounts: [{ role: 'student', _count: { id: 5 } }],
        totalClasses: 0,
        totalTasks: 0,
        totalSubmissions: 0,
        pendingGrades: 0
      })

      const { users } = await service.getForAdmin()

      expect(users.admins).toBe(0)
      expect(users.teachers).toBe(0)
      expect(users.students).toBe(5)
      expect(users.total).toBe(5)
    })
  })
})
