/**
 * Provider registry — the app talks to exactly one provider at a time.
 *
 * There is no automatic fallback (it was removed when the explicit
 * switch took its place, see docs/providers.md): on failure the
 * policy layer decides
 * between retrying the same provider and switching to the other one.
 * The mock provider is a dev/e2e convenience, never reachable in
 * production builds.
 *
 * The two live providers are thin: both dispatch through
 * backend-client.ts to our own proxy, which owns every upstream detail
 * (auth, raw schemas, adaptation, error classification). The mock is
 * the only provider that still computes its data in the browser.
 *
 * Import graph: this module imports clients as values; clients may
 * import the shared types from here only via `import type` (erased at
 * runtime, so the cycle never materialises).
 */

import type { Question, QuizConfig } from '../types/quiz'
import { isDifficulty, type Difficulty } from '../lib/difficulties'
import { fetchBackendCatalog, fetchBackendQuestions } from './backend-client'
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
   * Pool offset. Both the proxy and the mock paginate by offset; each
   * survival batch fetches the next slice of the pool.
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
// Catalog — the merged metadata + categories response
// ---------------------------------------------------------------------------

/** One leaf category — only the fields the UI renders. */
export interface CatalogCategory {
  id: string
  name: string
  slug: string
  quizCount?: number
}

/** A topic grouping categories — accordion header in the dropdown. */
export interface CatalogTopic {
  id: string
  name: string
  slug: string
  categories: CatalogCategory[]
}

/**
 * Everything /setup needs from a provider, in one request: the
 * difficulty levels and the category tree.
 *
 * The proxy narrows and prunes server-side (no EXPERT, no empty
 * categories); the mock still reports raw values, so consumers keep
 * filtering rather than trusting the shape.
 */
export interface Catalog {
  difficulties: Difficulty[]
  topics: CatalogTopic[]
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export type ProviderId = 'quizapi' | 'trivia' | 'mock'

export interface QuizProvider {
  id: ProviderId
  /** i18n key for the user-facing provider name (see T9). */
  labelKey: string
  /** One page of questions; `limit`/`offset` default to the batch policy. */
  fetchQuestions(
    config: QuizConfig,
    options?: QuestionsFetchOptions,
  ): Promise<QuestionsPage>
  /** Merged difficulties + category tree for /setup. */
  fetchCatalog(): Promise<Catalog>
}

/**
 * The mock reports raw difficulties ('EASY', …, 'EXPERT') from its
 * static fixtures, so its catalog is narrowed here to keep one shape
 * across providers — mockapi.ts itself stays untouched.
 */
async function fetchMockCatalog(): Promise<Catalog> {
  const [metadata, categories] = await Promise.all([
    fetchMockMetadata(),
    fetchMockCategories(),
  ])

  return {
    difficulties: metadata.difficulties
      .map((value) => value.toLowerCase())
      .filter(isDifficulty),
    topics: categories.topics,
  }
}

export const PROVIDERS: Record<ProviderId, QuizProvider> = {
  quizapi: {
    id: 'quizapi',
    labelKey: 'provider.quizapi',
    fetchQuestions: (config, options) =>
      fetchBackendQuestions('quizapi', config, options),
    fetchCatalog: () => fetchBackendCatalog('quizapi'),
  },
  trivia: {
    id: 'trivia',
    labelKey: 'provider.trivia',
    fetchQuestions: (config, options) =>
      fetchBackendQuestions('trivia', config, options),
    fetchCatalog: () => fetchBackendCatalog('trivia'),
  },
  mock: {
    id: 'mock',
    labelKey: 'provider.mock',
    fetchQuestions: fetchMockQuestionsPage,
    fetchCatalog: fetchMockCatalog,
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
