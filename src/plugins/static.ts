import fs from 'fs'
import path from 'path'
import fp from 'fastify-plugin'
import staticFiles from '@fastify/static'
import { FastifyInstance } from 'fastify'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

export const staticPlugin = fp(async (app: FastifyInstance) => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })

  await app.register(staticFiles, {
    root: UPLOAD_DIR,
    prefix: '/uploads',
    serve: false
  })
})
