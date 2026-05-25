import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'

import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

import { env } from '@/config/env'

export const swaggerPlugin = fp(async (app: FastifyInstance) => {
  await app.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      info: {
        title: 'iClass API',
        description: 'REST API for the iClass platform — manages users, classes, and related resources.',
        version: '1.0.0',
        contact: {
          name: 'iClass Team',
          email: 'contato@iclass.com.br'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Local development server'
        }
      ],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User management endpoints' },
        { name: 'Classes', description: 'Class (turma) management endpoints' },
        { name: 'Tasks', description: 'Task management endpoints' },
        { name: 'Submissions', description: 'Task submission and grading endpoints' },
        { name: 'Dashboard', description: 'Role-specific dashboard metrics' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Human-readable error message'
              }
            },
            required: ['message']
          }
        }
      }
    }
  })

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      deepLinking: true,
      displayRequestDuration: true
    }
  })
})
