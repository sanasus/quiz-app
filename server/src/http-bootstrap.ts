/**
 * HTTP surface wiring shared by main.ts and the test harness.
 *
 * Both must configure the app identically: a test that builds its own
 * app with a hand-copied prefix would keep passing after main.ts
 * changes, while production silently starts 404ing. Everything that is
 * not a provider-specific module lives here.
 */

import { Logger } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

// Module-level so the middleware stays a plain Express handler (usable
// through app.use) without re-creating a Logger per request.
const logger = new Logger('http')

/** Everything the frontend calls lives under this prefix. */
export const API_PREFIX = 'api'

/** Served outside the prefix (liveness probe for CI and deploys). */
export const NON_PREFIXED_PATHS = ['health'] as const

/**
 * One line per request: method, path, status, duration.
 *
 * For a proxy this is the first place to look when asking "what did the
 * upstream actually answer" — the exception filter's warn line only
 * covers failures that reached it, and says nothing about a 200 that
 * carried an unusable payload.
 */
export function accessLog(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const started = performance.now()

  response.on('finish', () => {
    const durationMs = Math.round(performance.now() - started)
    const line = `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`
    // 5xx is ours (or the upstream's) misbehaving — surface it loudly;
    // everything else is routine traffic.
    if (response.statusCode >= 500) {
      logger.warn(line)
    } else {
      logger.log(line)
    }
  })

  next()
}

/**
 * Wire the HTTP surface: global prefix, liveness probe outside it, and
 * the access log. Called before init() in both main.ts and tests.
 */
export function configureHttp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX, { exclude: [...NON_PREFIXED_PATHS] })
  app.use(accessLog)
}
