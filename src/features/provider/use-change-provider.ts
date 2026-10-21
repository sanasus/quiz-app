/**
 * Provider switch (T5): change the active API provider and reset
 * everything that belongs to the old one — the ['quiz'] query cache
 * and the quiz session — then return the user to /setup (a session
 * can't continue against a different provider's question pool).
 */

import { useNavigate } from '@tanstack/react-router'
import { queryClient } from '../../app/query-client'
import { track } from '../../shared/analytics/analytics'
import type { SwitchReason } from '../../shared/analytics/events'
import type { ErrorKind } from '../../shared/api/errors'
import { useProviderStore } from '../../shared/api/provider-store'
import { alternateProviderId } from '../../shared/api/providers'
import type { ProviderId } from '../../shared/api/providers'
import {
  DEFAULT_CONFIG,
  useQuizSessionStore,
} from '../../shared/lib/session-store'

/**
 * Returns `changeProvider(next?)`: switches the provider (toggles
 * quizapi ↔ trivia when `next` is omitted), wipes the quiz query
 * cache and the session, drops the provider-specific category, then
 * navigates to /setup (a session can't continue against a different
 * provider's question pool).
 */
export interface SwitchContext {
  /** Why the provider is being switched (analytics only). */
  reason: SwitchReason
  /** The error behind a forced switch. */
  kind?: ErrorKind
}

export function useChangeProvider(): (
  next?: ProviderId,
  context?: SwitchContext,
) => void {
  const navigate = useNavigate()

  return (next, context = { reason: 'settings' }) => {
    const current = useProviderStore.getState().providerId
    const target = next ?? alternateProviderId(current)
    useProviderStore.getState().setProviderId(target)
    track('provider_switched', {
      from: current,
      to: target,
      reason: context.reason,
      kind: context.kind,
    })

    // Both live providers' keys share the ['quiz'] base — one call
    // clears the caches of every provider.
    queryClient.removeQueries({ queryKey: ['quiz'] })
    useQuizSessionStore.getState().reset()
    // RESET deliberately keeps the config — quiz settings must survive
    // a plain reset — but categories are provider-specific slugs
    // (quizapi: programming… vs trivia: science…), so the old choice
    // would be dead in the new provider's list. Drop only the
    // category: difficulty/count/mode match across the live providers
    // and stay on purpose (retake with the same settings).
    useQuizSessionStore
      .getState()
      .updateConfig({ category: DEFAULT_CONFIG.category })
    navigate({ to: '/setup' })
  }
}
