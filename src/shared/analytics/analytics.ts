/**
 * Product analytics and error monitoring — PostHog, browser side.
 *
 * Collection is PRODUCTION ONLY: off in dev, in mock mode
 * (`VITE_USE_MOCK_DATA`) and whenever no project key is configured, so
 * local runs, e2e and CI never touch the statistics.
 *
 * Privacy: cookieless (`persistence: 'memory'`), no autocapture, no session
 * recording, no personal data, EU cloud — which is why there is no consent
 * banner. Do not turn recording on without a separate decision.
 *
 * `VITE_POSTHOG_KEY` is the one deliberate exception to "no key reaches the
 * browser": a PostHog project key is public by design (it can only write
 * events, never read them). Requests go through our own domain
 * (`/ingest`, rewritten in vercel.json) so ad blockers do not eat them.
 *
 * posthog-js is loaded on demand, after the first event, so it is never part
 * of the entry chunk.
 */

import type { PostHog } from 'posthog-js'
import type { AnalyticsEvents } from './events'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const KEY: string | undefined = import.meta.env.VITE_POSTHOG_KEY
const API_HOST: string = import.meta.env.VITE_POSTHOG_HOST || '/ingest'
const UI_HOST = 'https://eu.posthog.com'

export const analyticsEnabled: boolean =
  import.meta.env.PROD && Boolean(KEY) && !USE_MOCK

let client: Promise<PostHog> | null = null

function load(): Promise<PostHog> | null {
  if (!analyticsEnabled || !KEY) return null
  client ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: API_HOST,
      ui_host: UI_HOST,
      persistence: 'memory',
      autocapture: false,
      capture_pageview: false, // the SPA reports its own route changes
      disable_session_recording: true,
      person_profiles: 'identified_only',
      capture_exceptions: true, // unhandled errors and rejections
    })
    return posthog
  })
  return client
}

/** Run `action` once the client is ready; any failure is swallowed. */
function withClient(action: (posthog: PostHog) => void): void {
  load()
    ?.then(action)
    .catch(() => {})
}

export function track<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  withClient((posthog) => posthog.capture(event, properties))
}

export function trackPageview(path: string): void {
  withClient((posthog) =>
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      path,
    }),
  )
}

/** A caught error worth knowing about (render errors from the error boundary). */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  withClient((posthog) => posthog.captureException(error, context))
}
