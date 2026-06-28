import { z } from 'zod'

export const studentDashboardSchema = z.object({
  role: z.literal('student'),
  tasks: z.object({
    total: z.number(),
    submitted: z.number(),
    pending: z.number(),
    expired: z.number(),
    graded: z.number()
  }),
  score: z.object({
    totalEarned: z.number(),
    totalPossible: z.number(),
    average: z.number()
  })
})

export const teacherDashboardSchema = z.object({
  role: z.literal('teacher'),
  overview: z.object({
    totalClasses: z.number(),
    totalStudents: z.number(),
    totalTasks: z.number(),
    pendingGrades: z.number()
  }),
  classes: z.array(z.object({
    id: z.string(),
    code: z.string(),
    period: z.string(),
    grade: z.string(),
    studentCount: z.number(),
    taskCount: z.number(),
    pendingGrades: z.number()
  }))
})

export const adminDashboardSchema = z.object({
  role: z.literal('admin'),
  users: z.object({
    total: z.number(),
    admins: z.number(),
    teachers: z.number(),
    students: z.number()
  }),
  classes: z.object({ total: z.number() }),
  tasks: z.object({
    total: z.number(),
    submissions: z.number(),
    pendingGrades: z.number()
  })
})

export const dashboardResponseSchema = z.discriminatedUnion('role', [
  studentDashboardSchema,
  teacherDashboardSchema,
  adminDashboardSchema
])

export const dashboardChartsSchema = z.object({
  submissionsPerMonth: z.array(z.object({ month: z.string(), count: z.number() })),
  scorePerClass: z.array(z.object({ code: z.string(), avg: z.number() })),
})
