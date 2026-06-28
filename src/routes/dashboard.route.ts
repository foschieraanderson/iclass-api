import { FastifyInstance } from 'fastify'

import { getDashboardChartsController, getDashboardController } from '@/controllers/dashboard.controller'
import { dashboardChartsSchema, dashboardResponseSchema } from '@/schemas/dashboard.schema'
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

  app.get('/charts', {
    onRequest: [app.authenticate],
    schema: {
      ...authHeader,
      tags: ['Dashboard'],
      summary: 'Get dashboard charts data',
      description: 'Returns chart data for teachers and admins. Students are not supported (403).',
      response: {
        200: dashboardChartsSchema,
        401: errorSchema,
        403: errorSchema
      }
    }
  }, getDashboardChartsController)
}
