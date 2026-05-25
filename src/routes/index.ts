import { FastifyInstance } from 'fastify'

import { userRoutes } from './user.route'
import { authRoutes } from './auth.route'

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(userRoutes, { prefix: '/users' })
}
