import { uuidv7 } from 'uuidv7'

import { prisma } from '@/database/prisma'
import type { Role } from '@/database/generated/index.js'

export interface CreateUserData {
  name: string
  email: string
  password: string
  role: Role
}

export const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
} as const

export class UserRepository {
  async create(data: CreateUserData) {
    return prisma.user.create({
      data: { id: uuidv7(), ...data },
      select: publicSelect
    })
  }

  async findAll(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: publicSelect
    })
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicSelect })
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  async update(id: string, data: Partial<CreateUserData>) {
    return prisma.user.update({ where: { id }, data, select: publicSelect })
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } })
  }
}
