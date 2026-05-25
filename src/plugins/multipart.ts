import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import { FastifyInstance } from 'fastify'

export const multipartPlugin = fp(async (app: FastifyInstance) => {
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1
    }
  })
})
