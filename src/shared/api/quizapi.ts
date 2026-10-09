/**
 * QuizAPI client + TanStack Query hooks.
 *
 * Base URL: https://quizapi.io/api/v1
 * Auth: Authorization: Bearer VITE_QUIZAPI_KEY
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
import { adaptQuestions } from './adapter'
import {
  categoriesApiResponseSchema,
  metadataApiResponseSchema,
  quizApiQuestionSchema,
} from './schemas'
import { fetchMockMetadata } from './mock-data'
import { fetchMockCategories } from './mock-categories'
import { fetchMockQuestions } from './mock-questions'

// ---------------------------------------------------------------------------
// Dev flag
// ---------------------------------------------------------------------------

/** Whether to use mock data instead of live API calls. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// ---------------------------------------------------------------------------
// Raw fetch helpers (called by hooks)
// ---------------------------------------------------------------------------

const API_BASE = 'https://quizapi.io/api/v1'

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

async function fetchQuestions(config: QuizConfig): Promise<Question[]> {
  if (USE_MOCK) return fetchMockQuestions(config.questionCount, config.difficulty, config.category)

  const params = new URLSearchParams({
    limit: String(config.questionCount),
    difficulty: config.difficulty.toUpperCase(),
    random: 'true',
  })

  if (config.category && config.category !== 'all') {
    params.set('category', config.category)
  }

  const url = `${API_BASE}/questions?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
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

  // The API returns { success: true, data: [...] }
  const rawArray = (json as any).data ?? []

  if (!Array.isArray(rawArray) || rawArray.length === 0) {
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

  return valid
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

async function fetchMetadata(): Promise<ApiMetadata> {
  if (USE_MOCK) return fetchMockMetadata()

  const url = `${API_BASE}/metadata`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!response.ok) {
    throw new Error(`QuizAPI metadata error: HTTP ${response.status}`)
  }

  const json = await response.json()
  const parseResult = metadataApiResponseSchema.safeParse(json)

  if (!parseResult.success) {
    throw new Error(
      `Invalid metadata response: ${parseResult.error.message}`,
    )
  }

  return parseResult.data.data
}

// ---------------------------------------------------------------------------
// Categories (hierarchical: topics → categories with icons, quiz counts)
// ---------------------------------------------------------------------------

async function fetchCategories(): Promise<{
  topics: Topic[]
  /** All categories flattened for lookup by slug. */
  flatCategories: Category[]
}> {
  if (USE_MOCK) return fetchMockCategories()

  const url = `${API_BASE}/categories`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!response.ok) {
    throw new Error(`QuizAPI categories error: HTTP ${response.status}`)
  }

  const json = await response.json()
  const parseResult = categoriesApiResponseSchema.safeParse(json)

  if (!parseResult.success) {
    throw new Error(
      `Invalid categories response: ${parseResult.error.message}`,
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
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

const QUESTIONS_QUERY_KEY = ['quiz', 'questions'] as const

export function useQuizQuestions(config: QuizConfig | null) {
  return useQuery({
    queryKey: [...QUESTIONS_QUERY_KEY, config],
    queryFn: () => {
      if (!config) throw new Error('Quiz config is required')
      return fetchQuestions(config)
    },
    enabled: config !== null,
    retry: (count, error) => {
      // Don't retry on 401/403
      if (error.message.includes('Invalid or expired')) return false
      return count < 2
    },
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

// ---------------------------------------------------------------------------
// Session store (Zustand) — re-exported from session-store.ts
// ---------------------------------------------------------------------------

export { useQuizSessionStore } from '../lib/session-store'
