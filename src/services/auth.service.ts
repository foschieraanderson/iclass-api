import bcrypt from 'bcryptjs'

import { UserRepository } from '@/repositories/user.repository'
import type { LoginDTO } from '@/schemas/auth.schema'

const repository = new UserRepository()

export class AuthService {
  async validateCredentials(data: LoginDTO) {
    const user = await repository.findByEmail(data.email)

    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 })
    }

    const valid = await bcrypt.compare(data.password, user.password)

    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 })
    }

    return { id: user.id, email: user.email, role: user.role }
  }
}
