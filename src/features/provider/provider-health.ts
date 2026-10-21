/**
 * Which question sources have recently failed — in memory only.
 *
 * The switch policy (docs/providers.md) assumes the other provider is a
 * way out. When it has failed too, switching back and forth fixes
 * nothing, so the screens use this to show one «sources unavailable»
 * state instead of offering another switch. A failure goes stale after a
 * few minutes (providers recover), and a success clears it at once.
 *
 * Only provider faults count — `network` is the player's own connection
 * and never marks a provider as down.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import {
  QuizApiError,
  type ApiProviderId,
  type ErrorKind,
} from '../../shared/api/errors'
import type { ProviderId } from '../../shared/api/providers'

/** How long a failure keeps a provider «down» without a new attempt. */
export const FAILURE_TTL_MS = 5 * 60 * 1000

const LIVE_PROVIDERS: readonly ApiProviderId[] = ['quizapi', 'trivia']

export interface Failure {
  kind: ErrorKind
  at: number
}

export type Failures = Partial<Record<ApiProviderId, Failure>>

interface HealthStore {
  failures: Failures
  markFailed: (providerId: ApiProviderId, kind: ErrorKind, at?: number) => void
  markHealthy: (providerId: ApiProviderId) => void
  reset: () => void
}

export const useProviderHealth = create<HealthStore>((set) => ({
  failures: {},
  markFailed: (providerId, kind, at = Date.now()) =>
    set((s) => ({ failures: { ...s.failures, [providerId]: { kind, at } } })),
  markHealthy: (providerId) =>
    set((s) => {
      if (!s.failures[providerId]) return s
      const next = { ...s.failures }
      delete next[providerId]
      return { failures: next }
    }),
  reset: () => set({ failures: {} }),
}))

function isCurrent(failure: Failure | undefined, now: number): boolean {
  return failure !== undefined && now - failure.at < FAILURE_TTL_MS
}

/** Providers with a recent failure (the unavailable page lists them). */
export function failedProviders(
  failures: Failures,
  now = Date.now(),
): ApiProviderId[] {
  return LIVE_PROVIDERS.filter((id) => isCurrent(failures[id], now))
}

/** Both live providers failed recently: there is nothing to switch to. */
export function isDegraded(failures: Failures, now = Date.now()): boolean {
  return failedProviders(failures, now).length === LIVE_PROVIDERS.length
}

/** The provider other than `current` has failed recently. */
export function otherProviderFailed(
  failures: Failures,
  current: ProviderId,
  now = Date.now(),
): boolean {
  return LIVE_PROVIDERS.some(
    (id) => id !== current && isCurrent(failures[id], now),
  )
}

/**
 * Reactive «both sources are down». The clock is state, not a render-time
 * `Date.now()`: it is read once on mount and moved forward by a timer set
 * for the next expiry, so a stale failure stops counting without a new
 * event. (A failure recorded later than `now` is still current, so new
 * failures need no refresh.)
 */
export function useIsDegraded(): boolean {
  const failures = useProviderHealth((s) => s.failures)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const untilExpiry = failedProviders(failures, now).map(
      (id) => (failures[id]?.at ?? now) + FAILURE_TTL_MS - now,
    )
    if (untilExpiry.length === 0) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(...untilExpiry))
    return () => clearTimeout(timer)
  }, [failures, now])

  return isDegraded(failures, now)
}

/**
 * Feed a query's outcome into the health record: a success clears the
 * provider, a provider fault (anything but `network`) marks it.
 */
export function useReportProviderHealth(
  providerId: ProviderId,
  query: { isSuccess: boolean; error: Error | null },
): void {
  const { isSuccess, error } = query
  useEffect(() => {
    if (providerId === 'mock') return
    const { markFailed, markHealthy } = useProviderHealth.getState()
    if (isSuccess) markHealthy(providerId)
    else if (error instanceof QuizApiError && error.kind !== 'network') {
      markFailed(providerId, error.kind)
    }
  }, [providerId, isSuccess, error])
}
