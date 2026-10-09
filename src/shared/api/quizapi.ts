/**
 * QuizAPI client + TanStack Query hooks.
 *
 * Base URL: https://quizapi.io/api/v1
 * Auth: Authorization: Bearer VITE_QUIZAPI_KEY
 */

import { useQuery } from '@tanstack/react-query'
import type {
  Question,
  QuizConfig,
} from '../types/quiz'
import { adaptQuestions } from './adapter'
import { quizApiQuestionSchema } from './schemas'

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
// Session store (Zustand) — re-exported from session-store.ts
// ---------------------------------------------------------------------------

export { useQuizSessionStore } from '../lib/session-store'
