import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { configureHttp } from './http-bootstrap'

const logger = new Logger('bootstrap')

/**
 * A malformed PORT must not fall through to `listen(NaN)`, which
 * silently picks a random port and leaves the vite proxy connecting to
 * nothing.
 */
function resolvePort(raw: string | undefined): number {
  const port = Number(raw ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    logger.warn(`PORT=${raw ?? ''} is not a valid port — using 3000`)
    return 3000
  }
  return port
}

/**
 * What the proxy is configured with — presence only, never values.
 *
 * A typo'd `QUIZAPI_KY` otherwise surfaces much later as an `auth`
 * error on every quizapi request, which reads as a broken upstream
 * rather than a missing key: by then nobody thinks to check the env.
 */
function logConfig(): void {
  const value = (name: string, fallback: string): string =>
    process.env[name] ?? fallback

  logger.log(
    [
      `config: QUIZAPI_KEY=${process.env.QUIZAPI_KEY ? 'set' : 'absent'}`,
      `QUIZAPI_BASE_URL=${value('QUIZAPI_BASE_URL', 'live')}`,
      `TRIVIA_BASE_URL=${value('TRIVIA_BASE_URL', 'live')}`,
      `UPSTREAM_TIMEOUT_MS=${value('UPSTREAM_TIMEOUT_MS', '10000')}`,
      `TRUST_PROXY=${value('TRUST_PROXY', 'off')}`,
      `throttle=${value('THROTTLE_LIMIT', '30')}/${value('THROTTLE_TTL_MS', '60000')}ms per IP`,
    ].join(', '),
  )
}

async function bootstrap(): Promise<void> {
  logConfig()

  const app = await NestFactory.create(AppModule)

  configureHttp(app)

  // Same-origin in dev via the vite proxy, so CORS is off by default.
  // Set CORS_ORIGIN when the app is served from another origin.
  const corsOrigin = process.env.CORS_ORIGIN
  if (corsOrigin) {
    app.enableCors({ origin: corsOrigin })
  }

  // Behind a load balancer every request arrives from the balancer's
  // address, so the per-IP throttle would rate-limit the fleet as one
  // client. Set TRUST_PROXY to the number of hops to trust (1 behind a
  // single proxy) — unset means "the socket address is the client",
  // which is what a direct deployment wants.
  const trustProxy = Number(process.env.TRUST_PROXY)
  if (Number.isInteger(trustProxy) && trustProxy > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy)
  }

  // Let in-flight requests drain on SIGTERM instead of dying
  // mid-response: an upstream call can take up to 10s, and cutting it
  // off leaves the client with an abort instead of the typed envelope.
  app.enableShutdownHooks()

  await app.listen(resolvePort(process.env.PORT), '0.0.0.0')
}

bootstrap().catch((error: unknown) => {
  // A failed bootstrap is fatal — crash loudly rather than half-listen.
  logger.error(error)
  process.exit(1)
})
