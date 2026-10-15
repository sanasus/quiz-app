/**
 * Provider store — which quiz data source the app talks to.
 *
 * Persisted (unlike the session store): the choice survives reloads.
 * In mock mode (VITE_USE_MOCK_DATA=true, dev/e2e) the id is forced to
 * 'mock' on every rehydrate, so a stale persisted id can never route
 * the app to a live API.
 */

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { z } from 'zod'
import { DEFAULT_PROVIDER_ID, USE_MOCK } from './providers'
import type { ProviderId } from './providers'

/** Bump when the persisted shape changes. */
export const PROVIDER_STORE_VERSION = 1

export const providerIdSchema = z.enum(['quizapi', 'trivia', 'mock'])

/** Shape kept in localStorage (see `partialize`). */
const persistedProviderSchema = z.object({
  providerId: providerIdSchema,
})

interface ProviderStore {
  providerId: ProviderId
  setProviderId: (id: ProviderId) => void
}

export const useProviderStore = create<ProviderStore>()(
  persist(
    (set) => ({
      providerId: DEFAULT_PROVIDER_ID,

      setProviderId: (id) => set({ providerId: id }),
    }),
    {
      name: 'quiz-provider',
      version: PROVIDER_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        // Corrupt data must never break the app — fall back to the
        // default. Mock mode always wins over the persisted choice.
        const parsed = persistedProviderSchema.safeParse(persisted)
        const providerId = parsed.success
          ? parsed.data.providerId
          : DEFAULT_PROVIDER_ID
        return {
          ...current,
          providerId: USE_MOCK ? 'mock' : providerId,
        }
      },
      partialize: (s): { providerId: ProviderId } => ({
        providerId: s.providerId,
      }),
    },
  ),
)
