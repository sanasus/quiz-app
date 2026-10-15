/**
 * Dispatch tests: every hook routes through getProvider(providerId)
 * — the providerId in the query key and in the queryFn closure comes
 * from the same render, so a provider switch swaps both at once and
 * caches of different providers never mix. Also pins "no fallback":
 * a failing trivia request must never silently hit quizapi.io.
 */

import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuizConfig } from '../types/quiz'
import { useProviderStore } from './provider-store'
import { useCategories, useMetadata, useQuizQuestions } from './quizapi'

const config: QuizConfig = {
  category: 'all',
  difficulty: 'easy',
  questionCount: 5,
  mode: 'classic',
}

const TRIVIA_QUESTIONS_URL = 'the-trivia-api.com/v2/questions?'
const QUIZAPI_QUESTIONS_URL = 'quizapi.io/api/v1/questions?'

// ---------------------------------------------------------------------------
// fetch stub: route by URL, record every call
// ---------------------------------------------------------------------------

interface StubResponse {
  status: number
  body: unknown
}

let fetchCalls: string[] = []

/** Minimal Response the clients actually consume (ok/status/json). */
function jsonResponse({ status, body }: StubResponse) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function stubFetch(handler: (url: string) => StubResponse): void {
  fetchCalls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      fetchCalls.push(url)
      return jsonResponse(handler(url))
    }),
  )
}

/** Healthy responses for both providers (used unless a test says otherwise). */
function routeOk(url: string): StubResponse {
  if (url.includes('/questions/count'))
    return { status: 200, body: { count: 1 } }
  if (url.includes(TRIVIA_QUESTIONS_URL)) {
    return { status: 200, body: [triviaQuestion] }
  }
  if (url.includes('/v2/metadata')) return { status: 200, body: triviaMetadata }
  if (url.includes('/v2/categories')) {
    return { status: 200, body: { Science: ['science'] } }
  }
  if (url.includes(QUIZAPI_QUESTIONS_URL)) {
    return { status: 200, body: quizapiList }
  }
  if (url.includes('/api/v1/metadata')) {
    return { status: 200, body: quizapiMetadata }
  }
  if (url.includes('/api/v1/categories')) {
    return { status: 200, body: quizapiCategories }
  }
  return { status: 404, body: {} }
}

// ---------------------------------------------------------------------------
// Minimal valid payloads for both APIs
// ---------------------------------------------------------------------------

const triviaQuestion = {
  id: 't1',
  question: { text: 'What is 2+2?' },
  correctAnswer: '4',
  incorrectAnswers: ['3', '5', '6'],
  category: 'Science: Mathematics',
  difficulty: 'easy',
}

const triviaMetadata = {
  byCategory: { science: 1 },
  byDifficulty: { easy: 1 },
  byType: { text_choice: 1 },
  byState: {},
}

const quizapiList = {
  success: true,
  data: [
    {
      id: 'q1',
      text: 'What is 2+2?',
      difficulty: 'EASY',
      answers: [
        { id: 'a1', text: '4', isCorrect: true },
        { id: 'a2', text: '5', isCorrect: false },
      ],
    },
  ],
  meta: { total: 1 },
}

const quizapiMetadata = {
  success: true,
  data: {
    difficulties: ['easy'],
    questionTypes: ['MULTIPLE_CHOICE'],
    categories: ['science'],
    tags: [],
    stats: { totalQuizzes: 1, totalQuestions: 1 },
  },
}

const quizapiCategories = { success: true, data: [] }

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** Fresh QueryClient per test; no client-level retries to keep counts exact. */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function callsTo(fragment: string): string[] {
  return fetchCalls.filter((url) => url.includes(fragment))
}

describe('quiz data hooks dispatch by providerId', () => {
  beforeEach(() => {
    // The store is a module singleton — pin the starting provider.
    useProviderStore.setState({ providerId: 'quizapi' })
    stubFetch(routeOk)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('useQuizQuestions fetches from trivia when providerId=trivia', async () => {
    useProviderStore.setState({ providerId: 'trivia' })

    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))
    expect(callsTo(TRIVIA_QUESTIONS_URL)).toHaveLength(1)
    expect(callsTo('quizapi.io')).toHaveLength(0)
  })

  it('useQuizQuestions fetches from quizapi when providerId=quizapi', async () => {
    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))
    expect(callsTo(QUIZAPI_QUESTIONS_URL)).toHaveLength(1)
    expect(callsTo('the-trivia-api.com')).toHaveLength(0)
  })

  it('switching the provider mid-session swaps key and fetch target', async () => {
    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(callsTo(QUIZAPI_QUESTIONS_URL)).toHaveLength(1))
    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))

    act(() => {
      useProviderStore.getState().setProviderId('trivia')
    })

    await waitFor(() => expect(callsTo(TRIVIA_QUESTIONS_URL)).toHaveLength(1))
    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))
    // The quizapi query was completed, not refetched.
    expect(callsTo(QUIZAPI_QUESTIONS_URL)).toHaveLength(1)
  })

  it('does not fall back to quizapi when trivia fails', async () => {
    useProviderStore.setState({ providerId: 'trivia' })
    stubFetch((url) => {
      if (url.includes('/questions/count')) return { status: 500, body: {} }
      if (url.includes(TRIVIA_QUESTIONS_URL)) return { status: 500, body: {} }
      return routeOk(url)
    })

    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error?.message).toContain(
      'The Trivia API error: HTTP 500',
    )
    expect(callsTo('quizapi.io')).toHaveLength(0)
  })

  it('useMetadata fetches from the active provider', async () => {
    useProviderStore.setState({ providerId: 'trivia' })

    const { result } = renderHook(() => useMetadata(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.difficulties).toEqual(['easy'])
    expect(callsTo('the-trivia-api.com/v2/metadata')).toHaveLength(1)
    expect(callsTo('quizapi.io')).toHaveLength(0)
  })

  it('useCategories fetches from the active provider', async () => {
    useProviderStore.setState({ providerId: 'trivia' })

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.flatCategories).toHaveLength(1)
    expect(callsTo('the-trivia-api.com/v2/categories')).toHaveLength(1)
    expect(callsTo('quizapi.io')).toHaveLength(0)
  })
})
