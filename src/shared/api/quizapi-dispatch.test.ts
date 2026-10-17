/**
 * Dispatch tests for the proxy-backed hooks.
 *
 * Two things are pinned here:
 *  1. Every hook routes through getProvider(providerId) — the
 *     providerId in the query key, in the queryFn closure and in the
 *     `provider=` query param come from the same render, so switching
 *     the provider swaps all three at once and caches of different
 *     providers never mix.
 *  2. The browser only ever talks to our own `/api/quiz/*` and decides
 *     *switching* from the proxy's typed envelope, never from the
 *     status the proxy happens to answer with.
 */

import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuizConfig } from '../types/quiz'
import { fetchBackendCatalog, fetchBackendQuestions } from './backend-client'
import { QuizApiError } from './errors'
import { SURVIVAL_BATCH_SIZE } from './fetch-limits'
import { useProviderStore } from './provider-store'
import { useCatalog, useQuestionBatch, useQuizQuestions } from './quizapi'

const config: QuizConfig = {
  category: 'all',
  difficulty: 'easy',
  questionCount: 5,
  mode: 'classic',
}

const QUESTIONS_URL = '/api/quiz/questions?'
const CATALOG_URL = '/api/quiz/catalog?'

// ---------------------------------------------------------------------------
// fetch stub: route by URL, record every call
// ---------------------------------------------------------------------------

interface StubResponse {
  status: number
  body: unknown
  /** json() rejects the way a non-JSON body would. */
  unreadable?: boolean
}

let fetchCalls: string[] = []

/** Minimal Response the client actually consumes (ok/status/json). */
function jsonResponse({ status, body, unreadable }: StubResponse) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (unreadable) throw new SyntaxError('Unexpected token < in JSON')
      return body
    },
  }
}

/**
 * `handler` may throw to simulate an unreachable proxy — the same
 * rejection path a browser hits when nothing listens on :3000.
 */
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

/** Typed failure envelope exactly as server/src/quiz/http-error.filter.ts sends it. */
function envelope(
  kind: 'auth' | 'rate_limit' | 'parse' | 'http' | 'network' | 'timeout',
  providerId: 'quizapi' | 'trivia',
  overrides: { status?: number; retryAfter?: number; message?: string } = {},
): unknown {
  return {
    error: {
      kind,
      providerId,
      status: overrides.status,
      retryAfter: overrides.retryAfter,
      message: overrides.message ?? `${kind} failure`,
    },
  }
}

// ---------------------------------------------------------------------------
// Valid proxy payloads (the cleaned shape the server returns)
// ---------------------------------------------------------------------------

const proxyQuestion = {
  id: 'q1',
  text: 'What is 2+2?',
  options: [
    { id: 'a1', text: '4' },
    { id: 'a2', text: '5' },
  ],
  correctOptionIds: ['a1'],
  multiple: false,
  difficulty: 'easy',
}

const questionsBody = { questions: [proxyQuestion], total: 68 }

const catalogBody = {
  difficulties: ['easy', 'medium', 'hard'],
  topics: [
    {
      id: 'science',
      name: 'Science',
      slug: 'science',
      categories: [{ id: 'math', name: 'Math', slug: 'math', quizCount: 68 }],
    },
  ],
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** Healthy proxy for both providers (used unless a test says otherwise). */
function routeOk(url: string): StubResponse {
  if (url.includes(CATALOG_URL)) return { status: 200, body: catalogBody }
  if (url.includes(QUESTIONS_URL)) return { status: 200, body: questionsBody }
  return { status: 404, body: { error: 'Not Found' } }
}

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

/** Query params of the first request matching `fragment`. */
function paramsFor(fragment: string): URLSearchParams {
  const url = callsTo(fragment)[0]
  return new URL(url ?? '/api/quiz/none', 'http://localhost').searchParams
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

  it('never contacts an upstream — only /api/quiz/*', async () => {
    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))
    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0]).toContain(QUESTIONS_URL)
    expect(fetchCalls[0]?.includes('quizapi.io')).toBe(false)
    expect(fetchCalls[0]?.includes('the-trivia-api.com')).toBe(false)
  })

  it('useQuizQuestions fetches with provider=trivia when providerId=trivia', async () => {
    useProviderStore.setState({ providerId: 'trivia' })

    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))
    expect(paramsFor(QUESTIONS_URL).get('provider')).toBe('trivia')
    expect(callsTo('provider=quizapi')).toHaveLength(0)
  })

  it('sends the configured filters and defaults to the initial limit', async () => {
    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))
    const params = paramsFor(QUESTIONS_URL)
    expect(params.get('provider')).toBe('quizapi')
    expect(params.get('category')).toBe('all')
    expect(params.get('difficulty')).toBe('easy')
    expect(params.get('limit')).toBe('5')
    expect(params.get('offset')).toBe('0')
    expect(result.current.data?.total).toBe(68)
  })

  it('useQuestionBatch pages by offset with the survival batch size', async () => {
    useProviderStore.setState({ providerId: 'trivia' })

    const { result } = renderHook(
      () => useQuestionBatch(config, SURVIVAL_BATCH_SIZE, true),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))
    const params = paramsFor(QUESTIONS_URL)
    expect(params.get('limit')).toBe(String(SURVIVAL_BATCH_SIZE))
    expect(params.get('offset')).toBe(String(SURVIVAL_BATCH_SIZE))
  })

  it('switching the provider mid-session swaps key and provider param', async () => {
    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(callsTo('provider=quizapi')).toHaveLength(1))
    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))

    act(() => {
      useProviderStore.getState().setProviderId('trivia')
    })

    await waitFor(() => expect(callsTo('provider=trivia')).toHaveLength(1))
    await waitFor(() => expect(result.current.data?.questions).toHaveLength(1))
    // The quizapi query was completed, not refetched.
    expect(callsTo('provider=quizapi')).toHaveLength(1)
  })

  it('useCatalog fetches the merged catalog from the active provider', async () => {
    useProviderStore.setState({ providerId: 'trivia' })

    const { result } = renderHook(() => useCatalog(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.difficulties).toEqual([
      'easy',
      'medium',
      'hard',
    ])
    expect(result.current.data?.topics).toHaveLength(1)
    expect(paramsFor(CATALOG_URL).get('provider')).toBe('trivia')
    expect(callsTo('provider=quizapi')).toHaveLength(0)
  })
})

describe('failure mapping (the proxy decides, not the status)', () => {
  beforeEach(() => {
    useProviderStore.setState({ providerId: 'trivia' })
    stubFetch(routeOk)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function firstError(hook: () => { error: Error | null }) {
    const { result } = renderHook(hook, { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    return result.current as { error: QuizApiError }
  }

  /** Await a client call and return its typed rejection (fails otherwise). */
  async function rejectionOf(promise: Promise<unknown>): Promise<QuizApiError> {
    const thrown = await promise.then(
      () => null,
      (error: unknown) => error,
    )
    expect(thrown).toBeInstanceOf(QuizApiError)
    return thrown as QuizApiError
  }

  it('rehydrates the envelope verbatim — kind, providerId and message', async () => {
    stubFetch(() => ({
      status: 429,
      body: envelope('rate_limit', 'trivia', {
        retryAfter: 42,
        message: 'Rate limit exceeded. Try again in 42s.',
      }),
    }))

    const { error } = await firstError(() => useQuizQuestions(config))
    expect(error).toBeInstanceOf(QuizApiError)
    expect(error.kind).toBe('rate_limit')
    expect(error.providerId).toBe('trivia')
    expect(error.message).toBe('Rate limit exceeded. Try again in 42s.')
  })

  it('trusts the envelope over the status: 502 + kind parse → parse', async () => {
    // The proxy answers 502 for an upstream that sent garbage JSON.
    // Re-deriving from the status would report `http` — close enough
    // for switching, but wrong for the policy matrix, which treats
    // parse as "the data is broken" and http as "the upstream failed".
    stubFetch(() => ({
      status: 502,
      body: envelope('parse', 'trivia', { message: 'Upstream sent garbage' }),
    }))

    const { error } = await firstError(() => useQuizQuestions(config))
    expect(error.kind).toBe('parse')
    expect(error.message).toBe('Upstream sent garbage')
  })

  it('reports a non-JSON success body as parse (contract break)', async () => {
    stubFetch((url) => {
      if (url.includes(CATALOG_URL)) {
        return { status: 200, body: null, unreadable: true }
      }
      return routeOk(url)
    })

    const { error } = await firstError(() => useCatalog())
    expect(error.kind).toBe('parse')
  })

  it('reports a malformed success body as parse, not as data', async () => {
    stubFetch(() => ({ status: 200, body: { questions: 'nope' } }))

    const { error } = await firstError(() => useQuizQuestions(config))
    expect(error.kind).toBe('parse')
  })

  // The three `network` outcomes below are asserted straight through the
  // client rather than through TanStack Query: network is the one kind
  // retryQuestions allows to retry (quizapi.test.ts), so the hook would
  // hold the failure for 1s+2s of retry delays before surfacing it —
  // the classification itself is what these pins are about.

  it('trusts the envelope over the status: 502 + kind network → network', async () => {
    // Same status as the parse case above, different meaning: the
    // *proxy* failed to reach the provider. The policy must retry the
    // same provider instead of switching away from one whose failure
    // was the network's.
    stubFetch(() => ({
      status: 502,
      body: envelope('network', 'trivia', { message: 'Upstream unreachable' }),
    }))

    const error = await rejectionOf(fetchBackendQuestions('trivia', config))
    expect(error.kind).toBe('network')
    expect(error.message).toBe('Upstream unreachable')
  })

  it('reports an envelope-less failure of our own server as network', async () => {
    // 400/500 without the envelope = our proxy misbehaving (validation
    // bug, restart, the vite proxy answering instead of it). Switching
    // provider cannot fix something both providers share, so this must
    // never trigger the auto-switch — network is the only non-switching
    // kind.
    stubFetch(() => ({
      status: 400,
      body: { message: 'Validation failed', error: 'Bad Request' },
    }))

    const error = await rejectionOf(fetchBackendQuestions('trivia', config))
    expect(error.kind).toBe('network')
    expect(error.status).toBe(400)
  })

  it('reports an unreachable proxy as network', async () => {
    stubFetch(() => {
      throw new TypeError('fetch failed')
    })

    const error = await rejectionOf(fetchBackendCatalog('trivia'))
    expect(error.kind).toBe('network')
    expect(error.providerId).toBe('trivia')
  })
})

describe('dispatch: no fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retries the *same* provider on a network failure, never switching', async () => {
    useProviderStore.setState({ providerId: 'trivia' })
    stubFetch(() => {
      throw new TypeError('fetch failed')
    })

    const { result } = renderHook(() => useQuizQuestions(config), {
      wrapper: createWrapper(),
    })

    // network is the only retryable kind: retryQuestions allows two
    // attempts, both of which must keep targeting trivia.
    await waitFor(() => expect(fetchCalls.length).toBeGreaterThanOrEqual(2), {
      timeout: 5000,
    })
    expect(result.current.error).toBeNull()
    expect(callsTo('provider=trivia')).toHaveLength(fetchCalls.length)
    expect(callsTo('provider=quizapi')).toHaveLength(0)
  })
})
