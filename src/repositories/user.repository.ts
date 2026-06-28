import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { db } from '@/database/db'
import { type Role, users } from '@/database/schema'

export interface CreateUserData {
  name: string
  email: string
  password: string
  role: Role
}

export const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const

export class UserRepository {
  async create(data: CreateUserData) {
    const [user] = await db
      .insert(users)
      .values({ id: uuidv7(), ...data })
      .returning(publicColumns)
    return user
  }

  async findAll(role?: Role) {
    return db.query.users.findMany({
      where: role ? eq(users.role, role) : undefined,
      columns: { password: false },
    })
  }

  async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { password: false },
    })
  }

  async findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) }) ?? null
  }

  async findByIdWithPassword(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) }) ?? null
  }

  async update(id: string, data: Partial<CreateUserData>) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(publicColumns)
    return updated
  }

  async delete(id: string) {
    await db.delete(users).where(eq(users.id, id))
  }
}
