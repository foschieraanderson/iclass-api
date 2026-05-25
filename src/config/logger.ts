import { env } from './env'

export const loggerConfig =
  env.NODE_ENV === 'production'
    ? true
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      }
