import Fastify, { FastifyError, FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { swaggerPlugin } from '@/plugins/swagger'
import { jwtPlugin } from '@/plugins/jwt'
import { emailPlugin } from '@/plugins/email'
import { multipartPlugin } from '@/plugins/multipart'
import { staticPlugin } from '@/plugins/static'

import { loggerConfig } from '@/config/logger'
import { registerRoutes } from '@/routes'

export const app = Fastify({
  logger: loggerConfig
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.setErrorHandler((error: FastifyError, _request, reply) => {
  const statusCode = error.statusCode ?? 500
  reply.status(statusCode).send({ message: error.message })
})

export async function registerPlugins() {
  await app.register(cors, {
    origin: true
  })

  await app.register(jwtPlugin)
  await app.register(emailPlugin)
  await app.register(multipartPlugin)
  await app.register(staticPlugin)
  await app.register(swaggerPlugin)
  await app.register(registerRoutes)
  await app.register(helmet, {
    contentSecurityPolicy: false
  })
}

export async function buildApp(): Promise<FastifyInstance> {
  const instance = Fastify({ logger: false })

  instance.setValidatorCompiler(validatorCompiler)
  instance.setSerializerCompiler(serializerCompiler)
  instance.setErrorHandler((error: FastifyError, _request, reply) => {
    reply.status(error.statusCode ?? 500).send({ message: error.message })
  })

  await instance.register(cors, { origin: true })
  await instance.register(jwtPlugin)
  await instance.register(emailPlugin)
  await instance.register(multipartPlugin)
  await instance.register(staticPlugin)
  await instance.register(registerRoutes)

  await instance.ready()
  return instance
}
