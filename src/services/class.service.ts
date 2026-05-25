import { ClassRepository } from '@/repositories/class.repository'
import { UserRepository } from '@/repositories/user.repository'
import type { CreateClassDTO, UpdateClassDTO, ClassStudentBulkDTO } from '@/schemas/class.schema'

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

  async addStudents(classId: string, { studentIds }: ClassStudentBulkDTO): Promise<void> {
    await this.findById(classId)
    await this.validateStudents(studentIds)
    await repository.addStudents(classId, studentIds)
  }

  async removeStudents(classId: string, { studentIds }: ClassStudentBulkDTO): Promise<void> {
    await this.findById(classId)
    await repository.removeStudents(classId, studentIds)
  }

  async getReport(classId: string, requesterId: string, requesterRole: string) {
    const raw = await repository.findReport(classId)
    if (!raw) throw Object.assign(new Error('Class not found'), { statusCode: 404 })

    if (requesterRole === 'teacher' && raw.teacherId !== requesterId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    }

    const tasks = raw.tasks.map((t) => ({ id: t.id, title: t.title, score: t.score }))
    const totalPossible = tasks.reduce((sum, t) => sum + t.score, 0)

    const students = raw.students.map(({ student }) => {
      const submissions = tasks.map((task) => {
        const sub = raw.tasks
          .find((t) => t.id === task.id)!
          .submissions.find((s) => s.studentId === student.id)
        return {
          taskId: task.id,
          submitted: !!sub,
          grade: sub?.grade ?? null,
          gradedAt: sub?.gradedAt ?? null
        }
      })
      const totalEarned = submissions.reduce((sum, s) => sum + (s.grade ?? 0), 0)
      return { ...student, submissions, totalEarned, totalPossible }
    })

    return { classId: raw.id, classCode: raw.code, tasks, students }
  }

  async delete(id: string) {
    await this.findById(id)
    await repository.delete(id)
  }
}
