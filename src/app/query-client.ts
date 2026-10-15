/**
 * Shared TanStack Query client.
 *
 * Lives outside the React tree so non-React code can reach it too
 * (e.g. the provider switch clearing the ['quiz'] cache, T5).
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
})
