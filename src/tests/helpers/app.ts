import { vi } from 'vitest'

// The async factory lets us import fp() at factory execution time,
// avoiding the vi.mock hoisting issue with static imports
vi.mock('@/plugins/email', async () => {
  const { default: fp } = await import('fastify-plugin')
  return {
    emailPlugin: fp(async (app: { hasDecorator: (n: string) => boolean; decorate: (n: string, fn: unknown) => void }) => {
      if (!app.hasDecorator('sendEmail')) {
        app.decorate('sendEmail', vi.fn().mockResolvedValue(undefined))
      }
    })
  }
})

import { buildApp } from '@/app'
import type { FastifyInstance } from 'fastify'

export async function getTestApp(): Promise<FastifyInstance> {
  return buildApp()
}

export function signToken(
  app: FastifyInstance,
  payload: { sub: string; role: string },
  extra: Record<string, unknown> = {},
  expiresIn = '1h'
): string {
  return app.jwt.sign({ ...payload, ...extra }, { expiresIn })
}

export function bearerHeader(
  app: FastifyInstance,
  payload: { sub: string; role: string }
): Record<string, string> {
  return { authorization: `Bearer ${signToken(app, payload)}` }
}
