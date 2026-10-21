import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock('posthog-js', () => ({ default: posthog }))

/** Load a fresh copy of the module under the given build-time env. */
async function loadAnalytics(env: Record<string, string | boolean>) {
  vi.resetModules()
  // Vitest accepts booleans for the built-in flags (PROD/DEV) at runtime.
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value as string)
  }
  return import('./analytics')
}

beforeEach(() => {
  posthog.init.mockClear()
  posthog.capture.mockClear()
  posthog.captureException.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const PRODUCTION = { PROD: true, VITE_POSTHOG_KEY: 'phc_test' }

describe('analytics (disabled)', () => {
  it('is off in a development / test build', async () => {
    const analytics = await loadAnalytics({
      PROD: false,
      VITE_POSTHOG_KEY: 'phc_test',
    })

    analytics.track('share_clicked', { outcome: 'shared' })
    analytics.trackPageview('/results')
    analytics.captureException(new Error('x'))
    await Promise.resolve()

    expect(analytics.analyticsEnabled).toBe(false)
    expect(posthog.init).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('is off in a production build without a key', async () => {
    const analytics = await loadAnalytics({ PROD: true, VITE_POSTHOG_KEY: '' })

    analytics.track('share_clicked', { outcome: 'shared' })
    await Promise.resolve()

    expect(analytics.analyticsEnabled).toBe(false)
    expect(posthog.init).not.toHaveBeenCalled()
  })

  it('is off in mock mode even with a key', async () => {
    const analytics = await loadAnalytics({
      ...PRODUCTION,
      VITE_USE_MOCK_DATA: 'true',
    })

    analytics.track('share_clicked', { outcome: 'shared' })
    await Promise.resolve()

    expect(analytics.analyticsEnabled).toBe(false)
    expect(posthog.init).not.toHaveBeenCalled()
  })
})

describe('analytics (production)', () => {
  it('initialises once, cookieless, without autocapture or recording', async () => {
    const analytics = await loadAnalytics(PRODUCTION)

    analytics.track('share_clicked', { outcome: 'shared' })
    analytics.track('question_reported', { provider: 'quizapi' })
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledTimes(2))

    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: '/ingest',
        persistence: 'memory',
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
      }),
    )
  })

  it('sends typed events with their properties', async () => {
    const analytics = await loadAnalytics(PRODUCTION)

    analytics.track('provider_switched', {
      from: 'quizapi',
      to: 'trivia',
      reason: 'error_dialog',
      kind: 'rate_limit',
    })

    await vi.waitFor(() =>
      expect(posthog.capture).toHaveBeenCalledWith('provider_switched', {
        from: 'quizapi',
        to: 'trivia',
        reason: 'error_dialog',
        kind: 'rate_limit',
      }),
    )
  })

  it('reports pageviews itself (the SPA has no page loads)', async () => {
    const analytics = await loadAnalytics(PRODUCTION)

    analytics.trackPageview('/stats')

    await vi.waitFor(() =>
      expect(posthog.capture).toHaveBeenCalledWith(
        '$pageview',
        expect.objectContaining({ path: '/stats' }),
      ),
    )
  })

  it('forwards caught exceptions with context', async () => {
    const analytics = await loadAnalytics(PRODUCTION)
    const error = new Error('render failed')

    analytics.captureException(error, { source: 'error-boundary' })

    await vi.waitFor(() =>
      expect(posthog.captureException).toHaveBeenCalledWith(error, {
        source: 'error-boundary',
      }),
    )
  })

  it('never throws when PostHog fails', async () => {
    posthog.capture.mockImplementationOnce(() => {
      throw new Error('blocked')
    })
    const analytics = await loadAnalytics(PRODUCTION)

    expect(() =>
      analytics.track('share_clicked', { outcome: 'shared' }),
    ).not.toThrow()
    await Promise.resolve()
  })
})
