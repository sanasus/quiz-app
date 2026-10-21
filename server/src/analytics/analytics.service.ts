/**
 * Error reporting for the proxy — PostHog, server side.
 *
 * Every UpstreamError is sent with `kind` and `providerId` tags: a
 * provider that starts failing is the thing the product most needs to
 * hear about, and the browser never sees most of it. Disabled unless
 * POSTHOG_KEY is set AND NODE_ENV is "production", so dev runs, tests
 * and CI never report.
 *
 * Events are sent immediately (no batching): a serverless instance can be
 * frozen right after the response, which would strand a queued event.
 * Delivery never delays or fails the response.
 */

import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common'
import { PostHog } from 'posthog-node'
import type { UpstreamError } from '../quiz/errors'

/** Errors are not tied to a person: one anonymous server identity. */
const SERVER_DISTINCT_ID = 'quiz-proxy'

export const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com'

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name)
  private readonly client: PostHog | null

  constructor() {
    const env = process.env
    const key = env.POSTHOG_KEY
    this.client =
      key && env.NODE_ENV === 'production'
        ? new PostHog(key, {
            host: env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
            flushAt: 1,
            flushInterval: 0,
          })
        : null
  }

  get enabled(): boolean {
    return this.client !== null
  }

  /** Fire-and-forget: the caller's response must not wait for PostHog. */
  captureUpstreamError(error: UpstreamError, providerId: string): void {
    if (!this.client) return
    this.client
      .captureExceptionImmediate(error, SERVER_DISTINCT_ID, {
        kind: error.kind,
        providerId,
        ...(error.status !== undefined ? { status: error.status } : {}),
        source: 'proxy',
      })
      .catch((reason: unknown) => {
        this.logger.warn(`PostHog capture failed: ${String(reason)}`)
      })
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown()
  }
}
