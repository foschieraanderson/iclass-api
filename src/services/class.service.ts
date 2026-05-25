import { ClassRepository } from '@/repositories/class.repository'
import { UserRepository } from '@/repositories/user.repository'
import type { CreateClassDTO, UpdateClassDTO } from '@/schemas/class.schema'

const repository = new ClassRepository()
const userRepository = new UserRepository()

function buildCode(period: string, grade: string): string {
  return `${period}-${grade.toUpperCase()}`
}

export class ClassService {
  private async validateTeacher(teacherId: string) {
    const user = await userRepository.findById(teacherId)
    if (!user) throw Object.assign(new Error('Teacher not found'), { statusCode: 404 })
    if (user.role !== 'teacher') {
      throw Object.assign(new Error(`User ${user.email} is not a teacher`), { statusCode: 422 })
    }
    return user
  }

  private async validateStudents(studentIds: string[]) {
    for (const id of studentIds) {
      const user = await userRepository.findById(id)
      if (!user) throw Object.assign(new Error('Student not found'), { statusCode: 404 })
      if (user.role !== 'student') {
        throw Object.assign(new Error(`User ${user.email} is not a student`), { statusCode: 422 })
      }
    }
  }

  async create(data: CreateClassDTO) {
    await this.validateTeacher(data.teacherId)
    await this.validateStudents(data.studentIds)

    const code = buildCode(data.period, data.grade)
    const existing = await repository.findByCode(code)
    if (existing) {
      throw Object.assign(new Error(`Class with code ${code} already exists`), { statusCode: 409 })
    }

    return repository.create({ ...data, code })
  }

  async findAll() {
    return repository.findAll()
  }

  async findById(id: string) {
    const cls = await repository.findById(id)
    if (!cls) throw Object.assign(new Error('Class not found'), { statusCode: 404 })
    return cls
  }

  async update(id: string, data: UpdateClassDTO) {
    const existing = await this.findById(id)

    if (data.teacherId) {
      await this.validateTeacher(data.teacherId)
    }

    if (data.studentIds) {
      await this.validateStudents(data.studentIds)
    }

    const period = data.period ?? existing.period
    const grade = data.grade ?? existing.grade
    const code = buildCode(period, grade)

    if (code !== existing.code) {
      const conflict = await repository.findByCode(code)
      if (conflict) {
        throw Object.assign(new Error(`Class with code ${code} already exists`), { statusCode: 409 })
      }
    }

    return repository.update(id, { ...data, code })
  }

  async delete(id: string) {
    await this.findById(id)
    await repository.delete(id)
  }
}
