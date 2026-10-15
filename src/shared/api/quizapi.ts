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
import { useQuizSessionStore } from '../lib/session-store'
import { QuizApiError } from './errors'
import { useProviderStore } from './provider-store'
import { getProvider } from './providers'
import type { QuestionsPage } from './providers'
import { SURVIVAL_BATCH_SIZE } from './quizapi-client'

/** Shared base of every quiz query key. */
const QUIZ_QUERY_BASE = ['quiz'] as const

/**
 * Retry only cheap connectivity failures — network alone. A timeout
 * means the provider hung past REQUEST_TIMEOUT_MS: fail fast so the
 * dialog / auto-switch can offer a provider change immediately, with
 * no 2×10s wait (error-policy matrix, docs/provider-switch-plan.md).
 */
export function retryQuestions(count: number, error: Error): boolean {
  if (error instanceof QuizApiError) {
    return error.kind === 'network' && count < 2
  }
  return count < 2
}

export function useQuizQuestions(config: QuizConfig | null) {
  const store = useQuizSessionStore()
  const providerId = useProviderStore((s) => s.providerId)

  // If we're in a repeat session (questions already loaded in store),
  // skip the API call entirely
  const isRepeatSession =
    store.questions.length > 0 && store.status === 'playing'

  const query = useQuery({
    queryKey: [...QUIZ_QUERY_BASE, providerId, 'questions', config],
    queryFn: () => {
      if (!config) throw new Error('Quiz config is required')
      return getProvider(providerId).fetchQuestions(config)
    },
    enabled: config !== null && !isRepeatSession,
    retry: retryQuestions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // If in a repeat session, return stored questions instead of query data
  if (isRepeatSession) {
    return {
      data: {
        questions: store.questions,
        total: store.questions.length,
      } satisfies QuestionsPage,
      isLoading: false,
      error: null,
    }
  }

  return query
}

/**
 * Fetch one survival question batch.
 *
 * The offset is the number of questions already loaded, so each key
 * fetches a distinct slice of the pool (the live API paginates by
 * `offset` too). Disabled outside the survival prefetch window — see
 * useQuestionFeed.
 */
export function useQuestionBatch(
  config: QuizConfig | null,
  offset: number,
  enabled: boolean,
) {
  const providerId = useProviderStore((s) => s.providerId)

  return useQuery({
    queryKey: [
      ...QUIZ_QUERY_BASE,
      providerId,
      'questions',
      'batch',
      config,
      offset,
    ],
    queryFn: () => {
      if (!config) throw new Error('Quiz config is required')
      return getProvider(providerId).fetchQuestions(config, {
        limit: SURVIVAL_BATCH_SIZE,
        offset,
      })
    },
    enabled: enabled && config !== null,
    retry: retryQuestions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useMetadata — fetches available difficulties, question types, etc.
// ---------------------------------------------------------------------------

export function useMetadata() {
  const providerId = useProviderStore((s) => s.providerId)

  return useQuery({
    queryKey: [...QUIZ_QUERY_BASE, providerId, 'metadata'],
    queryFn: () => getProvider(providerId).fetchMetadata(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — changes rarely
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

// ---------------------------------------------------------------------------
// useCategories — fetches topics + flat category list
// ---------------------------------------------------------------------------

export function useCategories() {
  const providerId = useProviderStore((s) => s.providerId)

  return useQuery({
    queryKey: [...QUIZ_QUERY_BASE, providerId, 'categories'],
    queryFn: () => getProvider(providerId).fetchCategories(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}
