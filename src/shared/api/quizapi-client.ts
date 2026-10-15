/**
 * QuizAPI client — raw fetchers for https://quizapi.io/api/v1.
 *
 * Auth: Authorization: Bearer VITE_QUIZAPI_KEY
 * Failures are thrown as typed QuizApiError (see errors.ts).
 *
 * The provider registry lives in providers.ts; TanStack Query hooks
 * stay in quizapi.ts.
 */

import type {
  ApiMetadata,
  Category,
  Question,
  QuizConfig,
  Topic,
} from '../types/quiz'
import { adaptQuestions } from './adapter'
import { classifyError, httpErrorKind, QuizApiError } from './errors'
import type { QuestionsFetchOptions, QuestionsPage } from './providers'
import {
  categoriesApiResponseSchema,
  metadataApiResponseSchema,
  quizApiMetaSchema,
  quizApiQuestionSchema,
} from './schemas'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const API_BASE = 'https://quizapi.io/api/v1'

/** Every live request aborts after 10s — a hung API must not stall the app. */
export const REQUEST_TIMEOUT_MS = 10_000

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

/** Read the API key from Vite env. */
export function getApiKey(): string {
  const key = import.meta.env.VITE_QUIZAPI_KEY
  if (!key) {
    throw new Error(
      'VITE_QUIZAPI_KEY is not set. Create a .env file with your QuizAPI key.',
    )
  }
  return key
}

// ---------------------------------------------------------------------------
// URL builder (pure)
// ---------------------------------------------------------------------------

/**
 * Build the live /questions URL. Pure — unit-tested, because survival
 * batch loading silently depends on `offset` reaching the API.
 */
export function buildQuestionsUrl(
  config: QuizConfig,
  options: QuestionsFetchOptions = {},
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

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/** Live QuizAPI /questions. */
export async function fetchQuizApiQuestions(
  config: QuizConfig,
  options: QuestionsFetchOptions = {},
): Promise<QuestionsPage> {
  try {
    const offset = options.offset ?? 0

    const url = buildQuestionsUrl(config, options)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.status === 401 || response.status === 403) {
      throw new QuizApiError('Invalid or expired API key.', {
        kind: 'auth',
        providerId: 'quizapi',
        status: response.status,
      })
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') ?? '60'
      throw new QuizApiError(
        `Rate limit exceeded. Try again in ${retryAfter}s.`,
        {
          kind: 'rate_limit',
          providerId: 'quizapi',
          status: response.status,
        },
      )
    }

    if (!response.ok) {
      throw new QuizApiError(`QuizAPI error: HTTP ${response.status}`, {
        kind: 'http',
        providerId: 'quizapi',
        status: response.status,
      })
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
      throw new QuizApiError(
        'No questions returned from API. Try different settings.',
        { kind: 'parse', providerId: 'quizapi' },
      )
    }

    // Validate each item — log failures for debugging
    const valid: Question[] = []
    for (const raw of rawArray) {
      const parseResult = quizApiQuestionSchema.safeParse(raw)
      if (parseResult.success) {
        const adapted = adaptQuestions([parseResult.data])
        valid.push(...adapted)
      } else {
        console.warn(
          'Failed to parse question:',
          parseResult.error.message,
          raw,
        )
      }
    }

    if (valid.length === 0) {
      throw new QuizApiError(
        'API returned questions but none passed validation. Check API key and settings.',
        { kind: 'parse', providerId: 'quizapi' },
      )
    }

    return { questions: valid, total }
  } catch (error) {
    throw classifyError(error, 'quizapi')
  }
}

/** Live QuizAPI /metadata. */
export async function fetchQuizApiMetadata(): Promise<ApiMetadata> {
  const url = `${API_BASE}/metadata`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new QuizApiError(
        `QuizAPI metadata error: HTTP ${response.status}`,
        {
          kind: httpErrorKind(response.status),
          providerId: 'quizapi',
          status: response.status,
        },
      )
    }

    const json = await response.json()
    const parseResult = metadataApiResponseSchema.safeParse(json)

    if (!parseResult.success) {
      throw new QuizApiError(
        `Invalid metadata response: ${parseResult.error.message}`,
        {
          kind: 'parse',
          providerId: 'quizapi',
          cause: parseResult.error,
        },
      )
    }

    return parseResult.data.data
  } catch (error) {
    throw classifyError(error, 'quizapi')
  }
}

// ---------------------------------------------------------------------------
// Categories (hierarchical: topics → categories with icons, quiz counts)
// ---------------------------------------------------------------------------

/** Live QuizAPI /categories. */
export async function fetchQuizApiCategories(): Promise<{
  topics: Topic[]
  /** All categories flattened for lookup by slug. */
  flatCategories: Category[]
}> {
  const url = `${API_BASE}/categories`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new QuizApiError(
        `QuizAPI categories error: HTTP ${response.status}`,
        {
          kind: httpErrorKind(response.status),
          providerId: 'quizapi',
          status: response.status,
        },
      )
    }

    const json = await response.json()
    const parseResult = categoriesApiResponseSchema.safeParse(json)

    if (!parseResult.success) {
      throw new QuizApiError(
        `Invalid categories response: ${parseResult.error.message}`,
        {
          kind: 'parse',
          providerId: 'quizapi',
          cause: parseResult.error,
        },
      )
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
  } catch (error) {
    throw classifyError(error, 'quizapi')
  }
}
