import { count, eq, isNull } from 'drizzle-orm'

import { db } from '@/database/db'
import { classStudents, classes, taskSubmissions, tasks, users } from '@/database/schema'

export class DashboardRepository {
  async findStudentTasksWithSubmissions(studentId: string) {
    const enrolledClassIds = db
      .select({ classId: classStudents.classId })
      .from(classStudents)
      .where(eq(classStudents.studentId, studentId))

    return db.query.tasks.findMany({
      where: (t, { inArray }) => inArray(t.classId, enrolledClassIds),
      columns: { score: true, expiresAt: true },
      with: {
        submissions: {
          where: (s, { eq: eqFn }) => eqFn(s.studentId, studentId),
          columns: { grade: true, gradedAt: true, createdAt: true },
        },
      },
    })
  }

  async findTeacherClassesWithStats(teacherId: string) {
    const result = await db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      columns: { id: true, code: true, period: true, grade: true },
      with: {
        students: { columns: {} },
        tasks: {
          columns: {},
          with: {
            submissions: {
              where: isNull(taskSubmissions.grade),
              columns: { id: true },
            },
          },
        },
      },
    })

    return result.map((cls) => ({
      ...cls,
      _count: { students: cls.students.length, tasks: cls.tasks.length },
    }))
  }

  async getAdminStats() {
    const [rawCounts, [{ count: totalClasses }], [{ count: totalTasks }], [{ count: totalSubmissions }], [{ count: pendingGrades }]] =
      await Promise.all([
        db.select({ role: users.role, _count: count() }).from(users).groupBy(users.role),
        db.select({ count: count() }).from(classes),
        db.select({ count: count() }).from(tasks),
        db.select({ count: count() }).from(taskSubmissions),
        db.select({ count: count() }).from(taskSubmissions).where(isNull(taskSubmissions.grade)),
      ])
    const userCounts = rawCounts.map((r) => ({ role: r.role, _count: { id: r._count } }))
    return { userCounts, totalClasses, totalTasks, totalSubmissions, pendingGrades }
  }
}
