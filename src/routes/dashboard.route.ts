import { FastifyInstance } from 'fastify'

import { getDashboardController } from '@/controllers/dashboard.controller'
import { dashboardResponseSchema } from '@/schemas/dashboard.schema'
import { errorSchema } from '@/schemas/common.schema'

const authHeader = { security: [{ bearerAuth: [] }] }

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/', {
    onRequest: [app.authenticate],
    schema: {
      ...authHeader,
      tags: ['Dashboard'],
      summary: 'Get dashboard',
      description: 'Returns role-specific dashboard data. Students see task summary and scores; teachers see class and grading stats; admins see platform-wide metrics.',
      response: {
        200: dashboardResponseSchema,
        401: errorSchema
      }
    }
  }, getDashboardController)
}
