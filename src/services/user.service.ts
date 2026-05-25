import bcrypt from 'bcryptjs'

import { UserRepository } from '@/repositories/user.repository'
import type { CreateUserDTO, UpdateUserDTO } from '@/schemas/user.schema'

const repository = new UserRepository()

export class UserService {
  async create(data: CreateUserDTO) {
    const hashedPassword = await bcrypt.hash(data.password, 10)
    return repository.create({ ...data, password: hashedPassword })
  }

  async findAll() {
    return repository.findAll()
  }

  async findById(id: string) {
    const user = await repository.findById(id)

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 })
    }

    return user
  }

  async update(id: string, data: UpdateUserDTO) {
    await this.findById(id)

    const payload = { ...data } as Record<string, unknown>

    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password as string, 10)
    }

    return repository.update(id, payload as Parameters<typeof repository.update>[1])
  }

  async delete(id: string) {
    await this.findById(id)
    await repository.delete(id)
  }
}
