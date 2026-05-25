import { prisma } from '@/database/prisma'

export class DashboardRepository {
  async findStudentTasksWithSubmissions(studentId: string) {
    return prisma.task.findMany({
      where: { class: { students: { some: { studentId } } } },
      select: {
        score: true,
        expiresAt: true,
        submissions: {
          where: { studentId },
          select: { grade: true, gradedAt: true, createdAt: true }
        }
      }
    })
  }

  async findTeacherClassesWithStats(teacherId: string) {
    return prisma.class.findMany({
      where: { teacherId },
      select: {
        id: true,
        code: true,
        period: true,
        grade: true,
        _count: { select: { students: true, tasks: true } },
        tasks: {
          select: {
            submissions: { where: { grade: null }, select: { id: true } }
          }
        }
      }
    })
  }

  async getAdminStats() {
    const [userCounts, totalClasses, totalTasks, totalSubmissions, pendingGrades] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.class.count(),
      prisma.task.count(),
      prisma.taskSubmission.count(),
      prisma.taskSubmission.count({ where: { grade: null } })
    ])
    return { userCounts, totalClasses, totalTasks, totalSubmissions, pendingGrades }
  }
}
