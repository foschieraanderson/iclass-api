import { app, registerPlugins } from './app'
import { env } from './config/env'

async function bootstrap() {
  try {
    await registerPlugins()

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0'
    })

    app.log.info(`HTTP Server running on port ${env.PORT}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

const shutdown = async () => {
  await app.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

bootstrap()
