import { FastifyInstance } from 'fastify'

import { userRoutes } from './user.route'
import { authRoutes } from './auth.route'
import { classRoutes } from './class.route'
import { taskRoutes } from './task.route'

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(classRoutes, { prefix: '/classes' })
  await app.register(taskRoutes, { prefix: '/tasks' })
}
