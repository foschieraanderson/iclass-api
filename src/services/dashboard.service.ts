import { DashboardRepository } from '@/repositories/dashboard.repository'

const repository = new DashboardRepository()

export class DashboardService {
  async getForStudent(studentId: string) {
    const tasks = await repository.findStudentTasksWithSubmissions(studentId)
    const now = new Date()

    let submitted = 0, pending = 0, expired = 0, graded = 0
    let totalEarned = 0, totalPossible = 0

    for (const task of tasks) {
      totalPossible += task.score
      const sub = task.submissions[0] ?? null
      if (sub) {
        submitted++
        if (sub.grade != null) {
          graded++
          totalEarned += sub.grade
        }
      } else if (task.expiresAt && task.expiresAt <= now) {
        expired++
      } else {
        pending++
      }
    }

    return {
      role: 'student' as const,
      tasks: { total: tasks.length, submitted, pending, expired, graded },
      score: {
        totalEarned,
        totalPossible,
        average: graded > 0 ? Math.round((totalEarned / graded) * 10) / 10 : 0
      }
    }
  }

  async getForTeacher(teacherId: string) {
    const classes = await repository.findTeacherClassesWithStats(teacherId)

    const classStats = classes.map((cls) => {
      const pendingGrades = cls.tasks.reduce((sum, t) => sum + t.submissions.length, 0)
      return {
        id: cls.id,
        code: cls.code,
        period: cls.period,
        grade: cls.grade,
        studentCount: cls._count.students,
        taskCount: cls._count.tasks,
        pendingGrades
      }
    })

    return {
      role: 'teacher' as const,
      overview: {
        totalClasses: classes.length,
        totalStudents: classStats.reduce((sum, c) => sum + c.studentCount, 0),
        totalTasks: classStats.reduce((sum, c) => sum + c.taskCount, 0),
        pendingGrades: classStats.reduce((sum, c) => sum + c.pendingGrades, 0)
      },
      classes: classStats
    }
  }

  async getChartsForTeacher(teacherId: string) {
    const { submissionsPerMonth, scorePerClass } = await repository.getTeacherChartData(teacherId)
    return {
      submissionsPerMonth: submissionsPerMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
      scorePerClass: scorePerClass.map((r) => ({ code: r.code, avg: Number(r.avg) })),
    }
  }

  async getChartsForAdmin() {
    const { submissionsPerMonth, scorePerClass } = await repository.getAdminChartData()
    return {
      submissionsPerMonth: submissionsPerMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
      scorePerClass: scorePerClass.map((r) => ({ code: r.code, avg: Number(r.avg) })),
    }
  }

  async getForAdmin() {
    const { userCounts, totalClasses, totalTasks, totalSubmissions, pendingGrades } =
      await repository.getAdminStats()

    const byRole = Object.fromEntries(
      userCounts.map((r) => [r.role, r._count.id])
    ) as Record<string, number>

    return {
      role: 'admin' as const,
      users: {
        total: (byRole.admin ?? 0) + (byRole.teacher ?? 0) + (byRole.student ?? 0),
        admins: byRole.admin ?? 0,
        teachers: byRole.teacher ?? 0,
        students: byRole.student ?? 0
      },
      classes: { total: totalClasses },
      tasks: { total: totalTasks, submissions: totalSubmissions, pendingGrades }
    }
  }
}
