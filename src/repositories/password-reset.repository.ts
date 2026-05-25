import { uuidv7 } from 'uuidv7'

import { prisma } from '@/database/prisma'

export class PasswordResetRepository {
  async create(userId: string, code: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: { id: uuidv7(), userId, code, expiresAt }
    })
  }

  async findActiveByUserIdAndCode(userId: string, code: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        userId,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    })
  }

  async markAsUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() }
    })
  }

  async invalidatePreviousTokens(userId: string) {
    return prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    })
  }
}
