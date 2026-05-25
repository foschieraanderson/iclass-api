import { FastifyInstance } from 'fastify'

import { userRoutes } from './user.route'
import { authRoutes } from './auth.route'
import { classRoutes } from './class.route'
import { taskRoutes } from './task.route'
import { submissionRoutes } from './submission.route'
import { dashboardRoutes } from './dashboard.route'

export async function registerRoutes(app: FastifyInstance) {
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' })
      await v1.register(userRoutes, { prefix: '/users' })
      await v1.register(classRoutes, { prefix: '/classes' })
      await v1.register(taskRoutes, { prefix: '/tasks' })
      await v1.register(submissionRoutes, { prefix: '/submissions' })
      await v1.register(dashboardRoutes, { prefix: '/dashboard' })
    },
    { prefix: '/api/v1' }
  )
}
