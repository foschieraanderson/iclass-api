import fp from 'fastify-plugin'
import nodemailer from 'nodemailer'
import { FastifyInstance } from 'fastify'

import { env } from '@/config/env'

export const emailPlugin = fp(async (app: FastifyInstance) => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  })

  app.decorate('sendEmail', async (to: string, subject: string, html: string) => {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html })
  })
})
