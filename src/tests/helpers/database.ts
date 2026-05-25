import { prisma } from '@/database/prisma'

export async function cleanDatabase(): Promise<void> {
  await prisma.taskSubmission.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.task.deleteMany()
  await prisma.classStudent.deleteMany()
  await prisma.class.deleteMany()
  await prisma.user.deleteMany()
}
