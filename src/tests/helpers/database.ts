import { db } from '@/database/db'
import { classStudents, classes, passwordResetTokens, taskSubmissions, tasks, users } from '@/database/schema'

export async function cleanDatabase(): Promise<void> {
  await db.delete(taskSubmissions)
  await db.delete(passwordResetTokens)
  await db.delete(tasks)
  await db.delete(classStudents)
  await db.delete(classes)
  await db.delete(users)
}
