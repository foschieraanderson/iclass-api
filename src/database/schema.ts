import { relations } from 'drizzle-orm'
import { index, integer, pgEnum, pgTable, primaryKey, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('Role', ['admin', 'teacher', 'student'])
export type Role = (typeof roleEnum.enumValues)[number]

export const users = pgTable('User', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull().default('student'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const classes = pgTable('Class', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  period: text('period').notNull(),
  grade: text('grade').notNull(),
  teacherId: text('teacherId')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const classStudents = pgTable(
  'ClassStudent',
  {
    classId: text('classId')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: text('studentId')
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.classId, t.studentId] })],
)

export const tasks = pgTable(
  'Task',
  {
    id: text('id').primaryKey(),
    classId: text('classId')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    createdById: text('createdById')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    fileUrl: text('fileUrl'),
    score: integer('score').notNull(),
    expiresAt: timestamp('expiresAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [index('Task_classId_idx').on(t.classId)],
)

export const taskSubmissions = pgTable(
  'TaskSubmission',
  {
    id: text('id').primaryKey(),
    taskId: text('taskId')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    studentId: text('studentId')
      .notNull()
      .references(() => users.id),
    textAnswer: text('textAnswer'),
    fileUrl: text('fileUrl'),
    grade: integer('grade'),
    feedback: text('feedback'),
    gradedAt: timestamp('gradedAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [
    unique('TaskSubmission_taskId_studentId_key').on(t.taskId, t.studentId),
    index('TaskSubmission_studentId_idx').on(t.studentId),
  ],
)

export const passwordResetTokens = pgTable(
  'PasswordResetToken',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    expiresAt: timestamp('expiresAt').notNull(),
    usedAt: timestamp('usedAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [index('PasswordResetToken_userId_idx').on(t.userId)],
)

export const usersRelations = relations(users, ({ many }) => ({
  teachingClasses: many(classes),
  enrolledClasses: many(classStudents),
  createdTasks: many(tasks),
  submissions: many(taskSubmissions),
  resetTokens: many(passwordResetTokens),
}))

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, { fields: [classes.teacherId], references: [users.id] }),
  students: many(classStudents),
  tasks: many(tasks),
}))

export const classStudentsRelations = relations(classStudents, ({ one }) => ({
  class: one(classes, { fields: [classStudents.classId], references: [classes.id] }),
  student: one(users, { fields: [classStudents.studentId], references: [users.id] }),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  class: one(classes, { fields: [tasks.classId], references: [classes.id] }),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id] }),
  submissions: many(taskSubmissions),
}))

export const taskSubmissionsRelations = relations(taskSubmissions, ({ one }) => ({
  task: one(tasks, { fields: [taskSubmissions.taskId], references: [tasks.id] }),
  student: one(users, { fields: [taskSubmissions.studentId], references: [users.id] }),
}))

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}))
