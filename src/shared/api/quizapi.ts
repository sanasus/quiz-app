/**
 * TanStack Query hooks for quiz data.
 *
 * Each hook subscribes to the provider store and dispatches through
 * the registry (providers.ts): providerId goes into both the query
 * key and the queryFn closure from the same render, so switching the
 * provider invalidates every cache entry and can never mix a key with
 * another provider's data. There is no automatic fallback between
 * providers.
 */

import { useQuery } from '@tanstack/react-query'
import type { QuizConfig } from '../types/quiz'
import { QuizApiError } from './errors'
import { useProviderStore } from './provider-store'
import { SURVIVAL_BATCH_SIZE } from './fetch-limits'
import { loadBatch, loadQuiz } from '../../features/history/quiz-loader'
import { useReportProviderHealth } from '../../features/provider/provider-health'
import { getProvider } from './providers'

/** Shared base of every quiz query key. */
const QUIZ_QUERY_BASE = ['quiz'] as const

/**
 * Retry only cheap connectivity failures — network alone. A timeout
 * means the request hung: fail fast so the dialog / auto-switch can
 * offer a provider change immediately, with no 2×15s wait (error-policy
 * matrix, docs/providers.md).
 */
export function retryQuestions(count: number, error: Error): boolean {
  if (error instanceof QuizApiError) {
    return error.kind === 'network' && count < 2
  }
  return count < 2
}

export function useQuizQuestions(config: QuizConfig | null) {
  const providerId = useProviderStore((s) => s.providerId)

  const query = useQuery({
    queryKey: [...QUIZ_QUERY_BASE, providerId, 'questions', config],
    queryFn: () => {
      if (!config) throw new Error('Quiz config is required')
      return loadQuiz(providerId, config)
    },
    enabled: config !== null,
    retry: retryQuestions,
    // A quiz is assembled from the history and the cursor as they are NOW:
    // a cached page would hand the same questions to the next run.
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  useReportProviderHealth(providerId, query)
  return query
}

/**
 * Fetch one survival question batch.
 *
 * The key carries the pool position (`poolStart` + `poolConsumed`, the
 * raw items already used) and the loaded count, so every batch is its own
 * query: a batch that was filtered down to nothing still advances the
 * position, and random-paged providers (no position) still get a new key
 * per batch. Disabled outside the survival prefetch window — see
 * useQuestionFeed.
 */
export function useQuestionBatch(
  config: QuizConfig | null,
  position: { poolStart: number; poolConsumed: number; loaded: number },
  enabled: boolean,
) {
  const providerId = useProviderStore((s) => s.providerId)

  const query = useQuery({
    queryKey: [
      ...QUIZ_QUERY_BASE,
      providerId,
      'questions',
      'batch',
      config,
      position.poolStart,
      position.poolConsumed,
      position.loaded,
    ],
    queryFn: () => {
      if (!config) throw new Error('Quiz config is required')
      return loadBatch(providerId, config, SURVIVAL_BATCH_SIZE)
    },
    enabled: enabled && config !== null,
    retry: retryQuestions,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  useReportProviderHealth(providerId, query)
  return query
}

// ---------------------------------------------------------------------------
// useCatalog — difficulties + categories for /setup, one request
// ---------------------------------------------------------------------------

/**
 * The proxy merges the two upstream calls (metadata + categories) into
 * a single response, so the setup screen issues one query — which also
 * makes its failure a single error for the fallback policy to read.
 */
export function useCatalog() {
  const providerId = useProviderStore((s) => s.providerId)

  const query = useQuery({
    queryKey: [...QUIZ_QUERY_BASE, providerId, 'catalog'],
    queryFn: () => getProvider(providerId).fetchCatalog(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — changes rarely
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  useReportProviderHealth(providerId, query)
  return query
}
