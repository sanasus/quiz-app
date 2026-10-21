/**
 * Proxy-contract payloads and route handlers for the provider-switch
 * e2e suite (provider-switch.spec.ts).
 *
 * The app talks to our own proxy (`/api/quiz/*`, server/) and never to
 * an upstream, so intercepting that one same-origin path is what keeps
 * the suite hermetic: no Nest server is started and nothing escapes to
 * the network.
 *
 * Bodies mirror the wire contract the proxy guarantees, exactly as
 * src/shared/api/backend.schemas.ts validates it on the client.
 * Failures carry the typed envelope the proxy answers with, which the
 * client rehydrates into a QuizApiError — `kind` is what decides retry
 * vs provider switch, so a fixture names the failure instead of leaning
 * on an HTTP status the client no longer reads.
 *
 * Handlers dispatch on the `provider` query param and call
 * `route.fallback()` for the other provider's requests, so both
 * fixtures can be registered in any order.
 */

import type { Page, Route } from '@playwright/test'

export const API_GLOB = '**/api/quiz/**'

// ── Contract types ──────────────────────────────────────────────────────────

/** Every level the app supports — the proxy already dropped EXPERT. */
export type ProxyDifficulty = 'easy' | 'medium' | 'hard'

/** A cleaned question, exactly as the proxy returns it. */
export interface ProxyQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
  correctOptionIds: string[]
  category?: string
  difficulty: ProxyDifficulty
}

/** One page of questions (`GET /api/quiz/questions`). */
export interface ProxyQuestionsPage {
  questions: ProxyQuestion[]
  /** Absent when the pool size is unknown. */
  total?: number
}

/** Merged difficulties + category tree (`GET /api/quiz/catalog`). */
export interface ProxyCatalog {
  difficulties: ProxyDifficulty[]
  topics: {
    id: string
    name: string
    slug: string
    categories: {
      id: string
      name: string
      slug: string
      quizCount?: number
    }[]
  }[]
}

/** Options list with stable ids — `${questionId}-${index}`. */
function optionList(questionId: string, texts: string[]) {
  return texts.map((text, index) => ({ id: `${questionId}-${index}`, text }))
}

// ── QuizAPI payloads ────────────────────────────────────────────────────────

export const quizApiCatalog: ProxyCatalog = {
  difficulties: ['easy', 'medium', 'hard'],
  topics: [
    {
      id: 'science',
      name: 'Science',
      slug: 'science',
      categories: [
        {
          id: 'cat-physics',
          name: 'Physics',
          slug: 'physics',
          quizCount: 42,
        },
      ],
    },
  ],
}

/** Two questions and a pool the size of the page, as /questions answers. */
export function quizApiQuestions(count: number): ProxyQuestionsPage {
  return {
    questions: Array.from({ length: count }, (_, index) => {
      const id = `quizapi-${index + 1}`
      return {
        id,
        text: `QuizAPI question ${index + 1}?`,
        options: optionList(id, [
          'First option',
          'Second option',
          'Third option',
        ]),
        correctOptionIds: [`${id}-0`],
        category: 'Physics',
        difficulty: 'easy' as const,
      }
    }),
    total: count,
  }
}

// ── The Trivia API payloads ─────────────────────────────────────────────────

/**
 * The proxy folds the whole trivia pool into a single topic listing its
 * canonical categories (server/src/quiz/providers/trivia.provider.ts).
 */
export const triviaCatalog: ProxyCatalog = {
  difficulties: ['easy', 'medium', 'hard'],
  topics: [
    {
      id: 'the-trivia-api',
      name: 'The Trivia API',
      slug: 'the-trivia-api',
      categories: [
        {
          id: 'general_knowledge',
          name: 'General Knowledge',
          slug: 'general_knowledge',
          quizCount: 120,
        },
        {
          id: 'science',
          name: 'Science',
          slug: 'science',
          quizCount: 80,
        },
      ],
    },
  ],
}

/**
 * The three questions the survival run in provider-switch.spec.ts
 * walks through. Correct answers are distinct option texts, so picking
 * an option by its text stays unambiguous.
 */
export const triviaQuestions: ProxyQuestion[] = [
  {
    id: 'trivia-1',
    text: 'What is the capital of France?',
    options: optionList('trivia-1', ['Paris', 'London', 'Berlin', 'Rome']),
    correctOptionIds: ['trivia-1-0'],
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    id: 'trivia-2',
    text: 'Which planet is known as the Red Planet?',
    options: optionList('trivia-2', ['Mars', 'Venus', 'Jupiter', 'Saturn']),
    correctOptionIds: ['trivia-2-0'],
    category: 'Science',
    difficulty: 'easy',
  },
  {
    id: 'trivia-3',
    text: 'Who wrote the play Romeo and Juliet?',
    options: optionList('trivia-3', [
      'William Shakespeare',
      'Charles Dickens',
      'Mark Twain',
      'Jane Austen',
    ]),
    correctOptionIds: ['trivia-3-0'],
    category: 'Literature',
    difficulty: 'medium',
  },
]

// ── Route handlers ──────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/**
 * The proxy's failure envelope (server/src/quiz/http-error.filter.ts).
 * The status mirrors the mapping the filter applies to `kind`.
 */
function errorEnvelope(
  kind: 'http' | 'auth' | 'rate_limit' | 'parse' | 'timeout',
  providerId: 'quizapi' | 'trivia',
  message: string,
  status: number,
) {
  return jsonResponse({ error: { kind, providerId, status, message } }, status)
}

/** An upstream that fails every call — `http` is not a retryable kind. */
function upstreamDown(providerId: 'quizapi' | 'trivia', label: string) {
  return errorEnvelope('http', providerId, `${label} error: HTTP 500`, 500)
}

/** Last path segment of the intercepted `/api/quiz/<endpoint>` request. */
function endpointOf(url: URL): string {
  return url.pathname.split('/').pop() ?? ''
}

export interface QuizApiRouteOptions {
  /** Answer /questions with a typed upstream failure. */
  failQuestions?: boolean
  /** Fail every endpoint (a fully broken provider). */
  failAll?: boolean
  /** Invoked on every intercepted /questions request (attempt count). */
  onQuestionsRequest?: () => void
}

async function handleQuizApi(
  route: Route,
  url: URL,
  options: QuizApiRouteOptions,
) {
  if (endpointOf(url) === 'questions') {
    options.onQuestionsRequest?.()
    if (options.failQuestions || options.failAll) {
      await route.fulfill(upstreamDown('quizapi', 'QuizAPI'))
      return
    }
    await route.fulfill(jsonResponse(quizApiQuestions(2)))
    return
  }

  if (endpointOf(url) === 'catalog') {
    if (options.failAll) {
      await route.fulfill(upstreamDown('quizapi', 'QuizAPI'))
      return
    }
    await route.fulfill(jsonResponse(quizApiCatalog))
    return
  }

  // Unknown endpoint — keep the request off the real network.
  await route.fulfill({ status: 404, body: 'Unexpected quiz endpoint' })
}

export interface TriviaRouteOptions {
  /**
   * Answer every /questions request after the first `n` with a typed
   * failure. Trivia has no usable offset (every page is a random draw),
   * so "the initial load succeeds, the next survival batch fails" is
   * expressed by counting requests: the initial load of a survival run
   * takes two (a generous page, then one top-up while the fixture pool
   * is smaller than a batch).
   */
  failQuestionsAfter?: number
}

async function handleTrivia(
  route: Route,
  url: URL,
  options: TriviaRouteOptions,
  questionRequest: () => number,
) {
  if (endpointOf(url) === 'questions') {
    if (
      options.failQuestionsAfter !== undefined &&
      questionRequest() > options.failQuestionsAfter
    ) {
      await route.fulfill(upstreamDown('trivia', 'The Trivia API'))
      return
    }
    await route.fulfill(
      jsonResponse({
        questions: triviaQuestions,
        total: triviaQuestions.length,
      }),
    )
    return
  }

  if (endpointOf(url) === 'catalog') {
    await route.fulfill(jsonResponse(triviaCatalog))
    return
  }

  await route.fulfill({ status: 404, body: 'Unexpected quiz endpoint' })
}

/**
 * Intercept the proxy for one provider. Requests naming the other
 * provider fall through to the other fixture — or, unhandled, to the
 * dev server, which is how a test still fails loudly instead of
 * silently passing on a stray request.
 */
function routeProvider(
  page: Page,
  providerId: 'quizapi' | 'trivia',
  handle: (route: Route, url: URL) => Promise<void>,
) {
  return page.route(API_GLOB, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('provider') !== providerId) {
      await route.fallback()
      return
    }
    await handle(route, url)
  })
}

/** Intercept every quizapi request against the proxy (see options). */
export function routeQuizApi(page: Page, options: QuizApiRouteOptions = {}) {
  return routeProvider(page, 'quizapi', (route, url) =>
    handleQuizApi(route, url, options),
  )
}

/** Intercept every trivia request against the proxy (see options). */
export function routeTrivia(page: Page, options: TriviaRouteOptions = {}) {
  let questionRequests = 0
  return routeProvider(page, 'trivia', (route, url) =>
    handleTrivia(route, url, options, () => ++questionRequests),
  )
}

/** Fail trivia like a network-level outage (the proxy unreachable). */
export function abortTrivia(page: Page) {
  return routeProvider(page, 'trivia', async (route) => {
    await route.abort('internetdisconnected')
  })
}
