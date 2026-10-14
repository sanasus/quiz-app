/**
 * QuizAPI client + TanStack Query hooks.
 *
 * Base URL: https://quizapi.io/api/v1
 * Auth: Authorization: Bearer VITE_QUIZAPI_KEY
 *
 * Hybrid: any QuizAPI failure (timeout, network, 4xx/5xx, parsing)
 * falls back to The Trivia API — see withFallback below.
 *
 * Development: set VITE_USE_MOCK_DATA=true to use mock data instead of live API.
 */

import { useQuery } from '@tanstack/react-query'
import type {
  ApiMetadata,
  Category,
  Question,
  QuizConfig,
  Topic,
} from '../types/quiz'
import { useQuizSessionStore } from '../lib/session-store'
import { adaptQuestions } from './adapter'
import {
  categoriesApiResponseSchema,
  metadataApiResponseSchema,
  quizApiMetaSchema,
  quizApiQuestionSchema,
} from './schemas'
import { fetchMockMetadata } from './mock-data'
import { fetchMockCategories } from './mock-categories'
import { countMockQuestions, fetchMockQuestions } from './mock-questions'
import {
  fetchTriviaCategories,
  fetchTriviaMetadata,
  fetchTriviaQuestions,
} from './triviaapi'

// ---------------------------------------------------------------------------
// Dev flag
// ---------------------------------------------------------------------------

/** Whether to use mock data instead of live API calls. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// ---------------------------------------------------------------------------
// Raw fetch helpers (called by hooks)
// ---------------------------------------------------------------------------

const API_BASE = 'https://quizapi.io/api/v1'

/** Every live request aborts after 10s — a hung API must not stall the app. */
const REQUEST_TIMEOUT_MS = 10_000

/**
 * Survival loads questions in batches of this size instead of fetching
 * the whole configured count up front (plan, Этап 3).
 */
export const SURVIVAL_BATCH_SIZE = 10

/**
 * How many questions are fetched up front. Survival ignores the
 * question-count setting entirely: it always starts with the first
 * batch, then pulls batches of SURVIVAL_BATCH_SIZE until the API runs
 * out. Every other mode loads the full configured count.
 */
export function getInitialFetchLimit(config: QuizConfig): number {
  if (config.mode === 'survival') return SURVIVAL_BATCH_SIZE
  return config.questionCount
}

interface FetchQuestionsOptions {
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

/** Read the API key from Vite env. */
function getApiKey(): string {
  const key = import.meta.env.VITE_QUIZAPI_KEY
  if (!key) {
    throw new Error(
      'VITE_QUIZAPI_KEY is not set. Create a .env file with your QuizAPI key.',
    )
  }
  return key
}

/** Message of any thrown value (fetch rejects with non-Errors too). */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Run the primary provider (QuizAPI); on *any* failure — timeout,
 * network, 4xx/5xx, parsing — log it and retry against the fallback
 * provider (The Trivia API). If both fail, the combined message keeps
 * both originals so `retryQuestions` still matches primary substrings
 * like 'Invalid or expired' and 'Rate limit exceeded'.
 */
async function withFallback<T>(
  label: string,
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary()
  } catch (primaryError) {
    console.warn(
      `QuizAPI ${label} request failed, falling back to The Trivia API:`,
      primaryError,
    )
    try {
      return await fallback()
    } catch (fallbackError) {
      throw new Error(
        `${errorMessage(primaryError)}; fallback failed: ` +
          errorMessage(fallbackError),
      )
    }
  }
}

/**
 * Build the live /questions URL. Pure — unit-tested, because survival
 * batch loading silently depends on `offset` reaching the API.
 */
export function buildQuestionsUrl(
  config: QuizConfig,
  options: FetchQuestionsOptions = {},
): string {
  const limit = options.limit ?? getInitialFetchLimit(config)
  const offset = options.offset ?? 0

  const params = new URLSearchParams({
    limit: String(limit),
    difficulty: config.difficulty.toUpperCase(),
    random: 'true',
    offset: String(offset),
  })

  if (config.category && config.category !== 'all') {
    params.set('category', config.category)
  }

  return `${API_BASE}/questions?${params.toString()}`
}

/** Live QuizAPI /questions — the primary provider behind withFallback. */
async function fetchQuizApiQuestions(
  config: QuizConfig,
  options: FetchQuestionsOptions = {},
): Promise<QuestionsPage> {
  const offset = options.offset ?? 0

  const url = buildQuestionsUrl(config, options)

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid or expired API key.')
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') ?? '60'
    throw new Error(`Rate limit exceeded. Try again in ${retryAfter}s.`)
  }

  if (!response.ok) {
    throw new Error(`QuizAPI error: HTTP ${response.status}`)
  }

  const json = await response.json()

  // The API returns { success: true, data: [...], meta: { total } }
  const rawArray = (json as any).data ?? []
  const metaResult = quizApiMetaSchema.safeParse((json as any).meta)
  const total = metaResult.success ? metaResult.data.total : undefined

  if (!Array.isArray(rawArray) || rawArray.length === 0) {
    // Running past the end of the pool is a normal outcome for a
    // survival batch (offset > 0): an empty page means "exhausted",
    // not an error. An empty *initial* fetch is a config problem.
    if (offset > 0) return { questions: [], total }
    throw new Error('No questions returned from API. Try different settings.')
  }

  // Validate each item — log failures for debugging
  const valid: Question[] = []
  for (const raw of rawArray) {
    const parseResult = quizApiQuestionSchema.safeParse(raw)
    if (parseResult.success) {
      const adapted = adaptQuestions([parseResult.data])
      valid.push(...adapted)
    } else {
      console.warn('Failed to parse question:', parseResult.error.message, raw)
    }
  }

  if (valid.length === 0) {
    throw new Error(
      'API returned questions but none passed validation. Check API key and settings.',
    )
  }

  return { questions: valid, total }
}

/**
 * One page of questions: mock first (dev, never touches the network),
 * otherwise QuizAPI with an automatic fallback to The Trivia API.
 */
async function fetchQuestions(
  config: QuizConfig,
  options: FetchQuestionsOptions = {},
): Promise<QuestionsPage> {
  if (USE_MOCK) {
    return {
      questions: await fetchMockQuestions(
        options.limit ?? getInitialFetchLimit(config),
        config.difficulty,
        config.category,
        options.offset ?? 0,
      ),
      total: countMockQuestions(config.difficulty, config.category),
    }
  }

  return withFallback(
    'questions',
    () => fetchQuizApiQuestions(config, options),
    () =>
      fetchTriviaQuestions(config, {
        limit: options.limit ?? getInitialFetchLimit(config),
        offset: options.offset ?? 0,
      }),
  )
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/** Live QuizAPI /metadata — the primary provider behind withFallback. */
async function fetchQuizApiMetadata(): Promise<ApiMetadata> {
  const url = `${API_BASE}/metadata`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`QuizAPI metadata error: HTTP ${response.status}`)
  }

  const json = await response.json()
  const parseResult = metadataApiResponseSchema.safeParse(json)

  if (!parseResult.success) {
    throw new Error(`Invalid metadata response: ${parseResult.error.message}`)
  }

  return parseResult.data.data
}

async function fetchMetadata(): Promise<ApiMetadata> {
  if (USE_MOCK) return fetchMockMetadata()

  return withFallback('metadata', fetchQuizApiMetadata, fetchTriviaMetadata)
}

// ---------------------------------------------------------------------------
// Categories (hierarchical: topics → categories with icons, quiz counts)
// ---------------------------------------------------------------------------

/** Live QuizAPI /categories — the primary provider behind withFallback. */
async function fetchQuizApiCategories(): Promise<{
  topics: Topic[]
  /** All categories flattened for lookup by slug. */
  flatCategories: Category[]
}> {
  const url = `${API_BASE}/categories`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`QuizAPI categories error: HTTP ${response.status}`)
  }

  const json = await response.json()
  const parseResult = categoriesApiResponseSchema.safeParse(json)

  if (!parseResult.success) {
    throw new Error(`Invalid categories response: ${parseResult.error.message}`)
  }

  const topics: Topic[] = parseResult.data.data
  // Also build a flat list for quick slug → category lookup
  const flatCategories: Category[] = []
  for (const topic of topics) {
    for (const cat of topic.categories) {
      flatCategories.push({ ...cat, icon: cat.icon ?? null })
    }
  }

  // Filter: remove topics/categories with no quizzes
  const filteredTopics = topics
    .map((topic) => {
      const filteredCats = topic.categories.filter(
        (cat) => cat.quizCount != null && cat.quizCount > 0,
      )
      return {
        ...topic,
        categories: filteredCats,
      }
    })
    .filter((topic) => topic.categories.length > 0)

  // Update flatCategories to match filtered topics
  const filteredFlatCategories: Category[] = []
  for (const topic of filteredTopics) {
    for (const cat of topic.categories) {
      filteredFlatCategories.push({ ...cat, icon: cat.icon ?? null })
    }
  }

  return { topics: filteredTopics, flatCategories: filteredFlatCategories }
}

async function fetchCategories(): Promise<{
  topics: Topic[]
  /** All categories flattened for lookup by slug. */
  flatCategories: Category[]
}> {
  if (USE_MOCK) return fetchMockCategories()

  return withFallback(
    'categories',
    fetchQuizApiCategories,
    fetchTriviaCategories,
  )
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

const QUESTIONS_QUERY_KEY = ['quiz', 'questions'] as const

/**
 * Auth failures and rate limits need user action, not silent retries.
 */
function retryQuestions(count: number, error: Error): boolean {
  if (error.message.includes('Invalid or expired')) return false
  if (error.message.includes('Rate limit exceeded')) return false
  return count < 2
}

export function useQuizQuestions(config: QuizConfig | null) {
  const store = useQuizSessionStore()

  // If we're in a repeat session (questions already loaded in store),
  // skip the API call entirely
  const isRepeatSession =
    store.questions.length > 0 && store.status === 'playing'

  const query = useQuery({
    queryKey: [...QUESTIONS_QUERY_KEY, config],
    queryFn: () => {
      if (!config) throw new Error('Quiz config is required')
      return fetchQuestions(config)
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
  return useQuery({
    queryKey: [...QUESTIONS_QUERY_KEY, 'batch', config, offset],
    queryFn: () => {
      if (!config) throw new Error('Quiz config is required')
      return fetchQuestions(config, {
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

const METADATA_QUERY_KEY = ['quiz', 'metadata'] as const

export function useMetadata() {
  return useQuery({
    queryKey: METADATA_QUERY_KEY,
    queryFn: fetchMetadata,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — changes rarely
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

// ---------------------------------------------------------------------------
// useCategories — fetches topics + flat category list
// ---------------------------------------------------------------------------

const CATEGORIES_QUERY_KEY = ['quiz', 'categories'] as const

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}
