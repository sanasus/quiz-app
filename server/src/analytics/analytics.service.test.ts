import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const posthog = vi.hoisted(() => {
  const instances: Array<{
    key: string
    options: Record<string, unknown>
    captureExceptionImmediate: ReturnType<typeof vi.fn>
    shutdown: ReturnType<typeof vi.fn>
  }> = []
  class PostHog {
    captureExceptionImmediate = vi.fn().mockResolvedValue(undefined)
    shutdown = vi.fn().mockResolvedValue(undefined)
    constructor(
      public key: string,
      public options: Record<string, unknown>,
    ) {
      instances.push(this)
    }
  }
  return { PostHog, instances }
})

vi.mock('posthog-node', () => ({ PostHog: posthog.PostHog }))

import { UpstreamError } from '../quiz/errors'
import { AnalyticsService, DEFAULT_POSTHOG_HOST } from './analytics.service'

const saved = { ...process.env }

beforeEach(() => {
  posthog.instances.length = 0
  delete process.env.POSTHOG_KEY
  delete process.env.POSTHOG_HOST
  process.env.NODE_ENV = 'test'
})

afterEach(() => {
  process.env = { ...saved }
})

describe('AnalyticsService', () => {
  it('is off without a key', () => {
    process.env.NODE_ENV = 'production'

    const service = new AnalyticsService()

    expect(service.enabled).toBe(false)
    expect(posthog.instances).toHaveLength(0)
  })

  it('is off outside production even with a key', () => {
    process.env.POSTHOG_KEY = 'phc_test'

    expect(new AnalyticsService().enabled).toBe(false)
    expect(posthog.instances).toHaveLength(0)
  })

  it('sends immediately (no batching) to the EU host by default', () => {
    process.env.POSTHOG_KEY = 'phc_test'
    process.env.NODE_ENV = 'production'

    new AnalyticsService()

    expect(posthog.instances[0]).toMatchObject({
      key: 'phc_test',
      options: { host: DEFAULT_POSTHOG_HOST, flushAt: 1, flushInterval: 0 },
    })
  })

  it('honours POSTHOG_HOST', () => {
    process.env.POSTHOG_KEY = 'phc_test'
    process.env.POSTHOG_HOST = 'https://ph.example.com'
    process.env.NODE_ENV = 'production'

    new AnalyticsService()

    expect(posthog.instances[0].options.host).toBe('https://ph.example.com')
  })

  it('tags an upstream error with kind and providerId', () => {
    process.env.POSTHOG_KEY = 'phc_test'
    process.env.NODE_ENV = 'production'
    const service = new AnalyticsService()
    const error = new UpstreamError('rate_limit', 'slow down', { status: 429 })

    service.captureUpstreamError(error, 'quizapi')

    expect(posthog.instances[0].captureExceptionImmediate).toHaveBeenCalledWith(
      error,
      'quiz-proxy',
      expect.objectContaining({
        kind: 'rate_limit',
        providerId: 'quizapi',
        status: 429,
      }),
    )
  })

  it('never throws when delivery fails', async () => {
    process.env.POSTHOG_KEY = 'phc_test'
    process.env.NODE_ENV = 'production'
    const service = new AnalyticsService()
    posthog.instances[0].captureExceptionImmediate.mockRejectedValue(
      new Error('offline'),
    )

    expect(() =>
      service.captureUpstreamError(new UpstreamError('network', 'x'), 'trivia'),
    ).not.toThrow()
    await Promise.resolve()
  })

  it('does nothing when disabled', () => {
    const service = new AnalyticsService()

    expect(() =>
      service.captureUpstreamError(new UpstreamError('network', 'x'), 'trivia'),
    ).not.toThrow()
  })

  it('flushes on shutdown', async () => {
    process.env.POSTHOG_KEY = 'phc_test'
    process.env.NODE_ENV = 'production'
    const service = new AnalyticsService()

    await service.onModuleDestroy()

    expect(posthog.instances[0].shutdown).toHaveBeenCalled()
  })
})
