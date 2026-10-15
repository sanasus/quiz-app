/**
 * API payloads and route handlers for the provider-switch e2e suite
 * (provider-switch.spec.ts).
 *
 * Payloads mirror the zod schemas in src/shared/api/schemas.ts — the
 * app parses every live response, so hand-written bodies must
 * validate. Handlers dispatch on the request path and answer 404 for
 * anything unexpected: a test never falls through to the real
 * network.
 */

import type { Page, Route } from '@playwright/test'

// ── Route globs ─────────────────────────────────────────────────────────────

export const QUIZAPI_GLOB = '**/quizapi.io/**'
export const TRIVIA_GLOB = '**the-trivia-api.com/**'

// ── QuizAPI payloads ────────────────────────────────────────────────────────

/** metadataApiResponseSchema — `EXPERT` is filtered out by /setup. */
export const quizApiMetadata = {
  success: true,
  data: {
    difficulties: ['easy', 'medium', 'hard', 'EXPERT'],
    questionTypes: ['multiple_choice', 'true_false'],
    categories: ['science', 'history'],
    tags: [],
    stats: { totalQuizzes: 12, totalQuestions: 340 },
  },
}

/** categoriesApiResponseSchema — `quizCount > 0` keeps the category. */
export const quizApiCategories = {
  success: true,
  data: [
    {
      id: 'topic-science',
      name: 'Science',
      slug: 'science',
      icon: null,
      categories: [
        {
          id: 'cat-physics',
          name: 'Physics',
          slug: 'physics',
          icon: null,
          quizCount: 42,
        },
      ],
    },
  ],
}

/**
 * quizApiQuestionSchema inside the `{ success, data, meta }` envelope —
 * what /questions answers when it succeeds.
 */
export function quizApiQuestions(count: number) {
  return {
    success: true,
    data: Array.from({ length: count }, (_, index) => {
      const id = `quizapi-${index + 1}`
      return {
        id,
        text: `QuizAPI question ${index + 1}?`,
        difficulty: 'EASY',
        answers: [
          { id: `${id}-a`, text: 'First option', isCorrect: true },
          { id: `${id}-b`, text: 'Second option', isCorrect: false },
          { id: `${id}-c`, text: 'Third option', isCorrect: false },
        ],
      }
    }),
    meta: { total: count },
  }
}

// ── The Trivia API payloads ─────────────────────────────────────────────────

/** triviaApiMetadataSchema — keys feed difficulties and quizCounts. */
export const triviaMetadata = {
  byCategory: { general_knowledge: 120, science: 80, geography: 60 },
  byDifficulty: { easy: 100, medium: 90, hard: 70 },
  byType: { TextChoice: 260 },
  byState: { unpassed: 260 },
}

/** triviaApiCategoriesSchema — displayName → slug alias groups. */
export const triviaCategories = {
  'General Knowledge': ['general_knowledge'],
  Science: ['science'],
}

/** triviaApiCountSchema — the survival pool the header reports. */
export const triviaCount = { count: 3 }

export interface TriviaQuestionFixture {
  id: string
  question: { text: string }
  correctAnswer: string
  incorrectAnswers: string[]
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * triviaApiQuestionSchema — the three questions the survival run in
 * provider-switch.spec.ts walks through. Correct answers are distinct
 * substrings, so picking an option by answer text stays unambiguous.
 */
export const triviaQuestions: TriviaQuestionFixture[] = [
  {
    id: 'trivia-1',
    question: { text: 'What is the capital of France?' },
    correctAnswer: 'Paris',
    incorrectAnswers: ['London', 'Berlin', 'Rome'],
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    id: 'trivia-2',
    question: { text: 'Which planet is known as the Red Planet?' },
    correctAnswer: 'Mars',
    incorrectAnswers: ['Venus', 'Jupiter', 'Saturn'],
    category: 'Science',
    difficulty: 'easy',
  },
  {
    id: 'trivia-3',
    question: { text: 'Who wrote the play Romeo and Juliet?' },
    correctAnswer: 'William Shakespeare',
    incorrectAnswers: ['Charles Dickens', 'Mark Twain', 'Jane Austen'],
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

function serverErrorResponse() {
  return { status: 500, body: 'Internal Server Error' }
}

export interface QuizApiRouteOptions {
  /** Answer /questions with HTTP 500 instead of the fixtures. */
  failQuestions?: boolean
  /** Answer every endpoint with HTTP 500 (a fully broken provider). */
  failAll?: boolean
  /** Invoked on every intercepted /questions request (attempt count). */
  onQuestionsRequest?: () => void
}

async function handleQuizApi(route: Route, options: QuizApiRouteOptions) {
  const url = new URL(route.request().url())

  if (url.pathname.endsWith('/questions')) {
    options.onQuestionsRequest?.()
    if (options.failQuestions || options.failAll) {
      await route.fulfill(serverErrorResponse())
      return
    }
    await route.fulfill(jsonResponse(quizApiQuestions(2)))
    return
  }

  if (options.failAll) {
    await route.fulfill(serverErrorResponse())
    return
  }

  if (url.pathname.endsWith('/metadata')) {
    await route.fulfill(jsonResponse(quizApiMetadata))
    return
  }

  if (url.pathname.endsWith('/categories')) {
    await route.fulfill(jsonResponse(quizApiCategories))
    return
  }

  // Unknown path — keep the request off the real network.
  await route.fulfill({ status: 404, body: 'Unexpected QuizAPI path' })
}

/** Intercept every QuizAPI request (see QuizApiRouteOptions). */
export function routeQuizApi(page: Page, options: QuizApiRouteOptions = {}) {
  return page.route(QUIZAPI_GLOB, (route) => handleQuizApi(route, options))
}

export interface TriviaRouteOptions {
  /**
   * Answer /questions with a non-zero offset by HTTP 500: the first
   * survival batch (offset=0) succeeds, the next one fails.
   */
  failBatchOffset?: boolean
}

async function handleTrivia(route: Route, options: TriviaRouteOptions) {
  const url = new URL(route.request().url())

  if (url.pathname.endsWith('/questions/count')) {
    await route.fulfill(jsonResponse(triviaCount))
    return
  }

  if (url.pathname.endsWith('/questions')) {
    const offset = url.searchParams.get('offset')
    if (options.failBatchOffset && offset !== null && offset !== '0') {
      await route.fulfill(serverErrorResponse())
      return
    }
    await route.fulfill(jsonResponse(triviaQuestions))
    return
  }

  if (url.pathname.endsWith('/metadata')) {
    await route.fulfill(jsonResponse(triviaMetadata))
    return
  }

  if (url.pathname.endsWith('/categories')) {
    await route.fulfill(jsonResponse(triviaCategories))
    return
  }

  await route.fulfill({ status: 404, body: 'Unexpected Trivia API path' })
}

/** Intercept every Trivia API request (see TriviaRouteOptions). */
export function routeTrivia(page: Page, options: TriviaRouteOptions = {}) {
  return page.route(TRIVIA_GLOB, (route) => handleTrivia(route, options))
}

/** Fail every Trivia API request like a network-level outage. */
export function abortTrivia(page: Page) {
  return page.route(TRIVIA_GLOB, (route) => route.abort('internetdisconnected'))
}
