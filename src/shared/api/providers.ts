/**
 * Provider registry — the app talks to exactly one provider at a time.
 *
 * There is no automatic fallback (it was removed in T2, see
 * docs/provider-switch-plan.md): on failure the policy layer decides
 * between retrying the same provider and switching to the other one.
 * The mock provider is a dev/e2e convenience, never reachable in
 * production builds.
 *
 * Import graph: this module imports clients as values; clients may
 * import the shared types from here only via `import type` (erased at
 * runtime, so the cycle never materialises).
 */

import type {
  ApiMetadata,
  Category,
  Question,
  QuizConfig,
  Topic,
} from '../types/quiz'
import {
  fetchQuizApiCategories,
  fetchQuizApiMetadata,
  fetchQuizApiQuestions,
  getInitialFetchLimit,
} from './quizapi-client'
import {
  fetchTriviaCategories,
  fetchTriviaMetadata,
  fetchTriviaQuestions,
} from './triviaapi'
import {
  fetchMockCategories,
  fetchMockMetadata,
  fetchMockQuestionsPage,
} from './mockapi'

/** Whether to use mock data instead of live API calls. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// ---------------------------------------------------------------------------
// Shared fetch types (previously in quizapi.ts)
// ---------------------------------------------------------------------------

export interface QuestionsFetchOptions {
  /** Batch size to request (defaults to the initial fetch limit). */
  limit?: number
  /**
   * Pool offset. Both the live API and the mock paginate by offset;
   * each survival batch fetches the next slice of the pool.
   */
  offset?: number
}

/** One page of questions plus the pool size under the same filters. */
export interface QuestionsPage {
  questions: Question[]
  /**
   * Total questions in the pool matching this config (live API
   * `meta.total`, mock pool length). Undefined when the API omits it.
   */
  total?: number
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export type ProviderId = 'quizapi' | 'trivia' | 'mock'

export interface QuizProvider {
  id: ProviderId
  /** i18n key for the user-facing provider name (see T9). */
  labelKey: string
  /** Only quizapi needs VITE_QUIZAPI_KEY. */
  requiresApiKey: boolean
  fetchQuestions(
    config: QuizConfig,
    options?: QuestionsFetchOptions,
  ): Promise<QuestionsPage>
  fetchMetadata(): Promise<ApiMetadata>
  fetchCategories(): Promise<{
    topics: Topic[]
    flatCategories: Category[]
  }>
}

export const PROVIDERS: Record<ProviderId, QuizProvider> = {
  quizapi: {
    id: 'quizapi',
    labelKey: 'provider.quizapi',
    requiresApiKey: true,
    fetchQuestions: fetchQuizApiQuestions,
    fetchMetadata: fetchQuizApiMetadata,
    fetchCategories: fetchQuizApiCategories,
  },
  trivia: {
    id: 'trivia',
    labelKey: 'provider.trivia',
    requiresApiKey: false,
    // The trivia client takes required limit/offset; fill the same
    // defaults the old fallback wiring used.
    fetchQuestions: (config, options = {}) =>
      fetchTriviaQuestions(config, {
        limit: options.limit ?? getInitialFetchLimit(config),
        offset: options.offset ?? 0,
      }),
    fetchMetadata: fetchTriviaMetadata,
    fetchCategories: fetchTriviaCategories,
  },
  mock: {
    id: 'mock',
    labelKey: 'provider.mock',
    requiresApiKey: false,
    fetchQuestions: fetchMockQuestionsPage,
    fetchMetadata: fetchMockMetadata,
    fetchCategories: fetchMockCategories,
  },
}

export function getProvider(id: ProviderId): QuizProvider {
  return PROVIDERS[id]
}

/**
 * Options for the settings switcher: the two live providers, plus
 * mock only while it is the active source (env-forced dev/e2e mode —
 * leaving it removes the manual way back; the env flag decides on the
 * next load).
 */
export function getSwitcherProviders(current: ProviderId): ProviderId[] {
  const ids: ProviderId[] = ['quizapi', 'trivia']
  if (current === 'mock') ids.push('mock')
  return ids
}

/** The other live provider: switching is quizapi ↔ trivia, mock → quizapi. */
export function alternateProviderId(current: ProviderId): ProviderId {
  if (current === 'quizapi') return 'trivia'
  return 'quizapi'
}

export const DEFAULT_PROVIDER_ID: ProviderId = USE_MOCK ? 'mock' : 'quizapi'
