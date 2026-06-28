import { and, eq, gt, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { db } from '@/database/db'
import { passwordResetTokens } from '@/database/schema'

export class PasswordResetRepository {
  async create(userId: string, code: string, expiresAt: Date) {
    const [token] = await db
      .insert(passwordResetTokens)
      .values({ id: uuidv7(), userId, code, expiresAt })
      .returning()
    return token
  }

  async findActiveByUserIdAndCode(userId: string, code: string) {
    return (
      db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.userId, userId),
          eq(passwordResetTokens.code, code),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      }) ?? null
    )
  }

  async markAsUsed(id: string) {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id))
  }

  async invalidatePreviousTokens(userId: string) {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))
  }
}
