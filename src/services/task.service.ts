import { TaskRepository } from '@/repositories/task.repository'
import { ClassRepository } from '@/repositories/class.repository'
import type { CreateTaskDTO, UpdateTaskDTO } from '@/schemas/task.schema'

const repository = new TaskRepository()
const classRepository = new ClassRepository()

export class TaskService {
  private async requireClass(classId: string) {
    const cls = await classRepository.findById(classId)
    if (!cls) throw Object.assign(new Error('Class not found'), { statusCode: 404 })
    return cls
  }

  private async requireTask(id: string) {
    const task = await repository.findByIdWithClass(id)
    if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 })
    return task
  }

  private checkOwnership(teacherId: string, requesterId: string) {
    if (teacherId !== requesterId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    }
  }

  async create(data: CreateTaskDTO, fileUrl: string | undefined, requesterId: string, requesterRole: string) {
    const cls = await this.requireClass(data.classId)

    if (requesterRole === 'teacher') {
      this.checkOwnership(cls.teacher.id, requesterId)
    }

    return repository.create({
      classId: data.classId,
      createdById: requesterId,
      title: data.title,
      description: data.description,
      fileUrl,
      score: data.score,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
    })
  }

  async findAll(classId: string | undefined, requesterId: string, requesterRole: string) {
    if (requesterRole === 'teacher') {
      const teachingClasses = await classRepository.findAll()
      const ownedIds = new Set(teachingClasses.filter((c) => c.teacher.id === requesterId).map((c) => c.id))

      if (classId) {
        if (!ownedIds.has(classId)) {
          throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
        }
        return repository.findAll(classId)
      }

      const allTasks = await repository.findAll()
      return allTasks.filter((t) => ownedIds.has(t.classId))
    }

    return repository.findAll(classId)
  }

  async findById(id: string) {
    const task = await repository.findById(id)
    if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 })
    return task
  }

  async update(id: string, data: UpdateTaskDTO, fileUrl: string | undefined, requesterId: string, requesterRole: string) {
    const task = await this.requireTask(id)

    if (requesterRole === 'teacher') {
      this.checkOwnership(task.class.teacherId, requesterId)
    }

    return repository.update(id, {
      title: data.title,
      description: data.description,
      ...(fileUrl !== undefined ? { fileUrl } : {}),
      score: data.score,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
    })
  }

  async delete(id: string, requesterId: string, requesterRole: string) {
    const task = await this.requireTask(id)

    if (requesterRole === 'teacher') {
      this.checkOwnership(task.class.teacherId, requesterId)
    }

    await repository.delete(id)
  }
}
