/**
 * TriviaProvider — upstream behaviour with a stubbed fetch.
 *
 * Key server-side semantics pinned here: the count request is
 * non-fatal (degrades to total: undefined), an empty page at offset 0
 * is a config problem while offset > 0 means the pool ran out, and the
 * trivia limit cap of 50 is enforced.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { TriviaProvider } from './trivia.provider'
import { UpstreamError } from '../errors'
import type { QuestionsQuery } from '../types'

const BASE = 'https://trivia.test/v2'

const query: QuestionsQuery = {
  category: 'all',
  difficulty: 'easy',
  limit: 10,
  offset: 0,
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function makeTrivia(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    question: { text: 'What is 2+2?' },
    correctAnswer: '4',
    incorrectAnswers: ['3', '5', '6'],
    category: 'Science: Mathematics',
    difficulty: 'easy',
    ...overrides,
  }
}

describe('TriviaProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function provider(): TriviaProvider {
    return new TriviaProvider({ baseUrl: BASE })
  }

  describe('buildQuestionsUrl', () => {
    it('clamps limit to the API cap of 50', () => {
      for (const limit of [99, 500]) {
        const url = provider().buildQuestionsUrl({ ...query, limit })
        expect(new URL(url).searchParams.get('limit')).toBe('50')
      }
    })

    it('always requests text_choice questions', () => {
      expect(provider().buildQuestionsUrl(query)).toContain('types=text_choice')
    })

    it('passes the category only when the slug maps to trivia', () => {
      const physics = provider().buildQuestionsUrl({
        ...query,
        category: 'physics',
      })
      const javascript = provider().buildQuestionsUrl({
        ...query,
        category: 'javascript',
      })

      expect(new URL(physics).searchParams.get('categories')).toBe('science')
      expect(new URL(javascript).searchParams.has('categories')).toBe(false)
    })
  })

  describe('fetchQuestions', () => {
    it('adapts a valid page', async () => {
      // Fresh Response per call: count and questions are fetched in
      // parallel and each consumes its own body.
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve(jsonResponse([makeTrivia()])),
          ),
      )

      const page = await provider().fetchQuestions(query)

      expect(page.questions).toHaveLength(1)
      expect(page.questions[0].text).toBe('What is 2+2?')
      expect(page.questions[0].correctOptionIds).toHaveLength(1)
    })

    it('returns the count as total', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/questions/count')) {
          return Promise.resolve(jsonResponse({ count: 42 }))
        }
        return Promise.resolve(jsonResponse([makeTrivia()]))
      })
      vi.stubGlobal('fetch', fetchMock)

      const page = await provider().fetchQuestions(query)

      expect(page.total).toBe(42)
    })

    it('degrades to an unknown total when the count request fails', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/questions/count')) {
          return Promise.resolve(new Response('{}', { status: 500 }))
        }
        return Promise.resolve(jsonResponse([makeTrivia()]))
      })
      vi.stubGlobal('fetch', fetchMock)

      const page = await provider().fetchQuestions(query)

      expect(page.total).toBeUndefined()
      expect(page.questions).toHaveLength(1)
    })

    it('skips the count request past the first page', async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() => Promise.resolve(jsonResponse([makeTrivia()])))
      vi.stubGlobal('fetch', fetchMock)

      await provider().fetchQuestions({ ...query, offset: 10 })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][0]).not.toContain('/questions/count')
    })

    it('throws parse when the initial fetch is empty', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => Promise.resolve(jsonResponse([]))),
      )

      const error = (await provider()
        .fetchQuestions(query)
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('parse')
    })

    it('returns an empty page (not an error) when offset > 0', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => Promise.resolve(jsonResponse([]))),
      )

      const page = await provider().fetchQuestions({ ...query, offset: 20 })

      expect(page.questions).toEqual([])
    })

    it('drops malformed items without failing the page', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve(jsonResponse([makeTrivia(), { id: 'broken' }])),
          ),
      )

      const page = await provider().fetchQuestions(query)

      expect(page.questions).toHaveLength(1)
      expect(page.questions[0].id).toBe('q1')
    })

    it('classifies 429 as rate_limit and forwards Retry-After', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('{}', {
            status: 429,
            headers: { 'Retry-After': '30' },
          }),
        ),
      )

      const error = (await provider()
        .fetchQuestions(query)
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('rate_limit')
      expect(error.status).toBe(429)
      // The client's rate-limit handling keys off this hint.
      expect(error.retryAfter).toBe(30)
    })
  })

  describe('fetchCatalog', () => {
    it('builds one topic from /categories enriched by /metadata', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/categories')) {
          return Promise.resolve(
            jsonResponse({
              'Film & TV': ['movies', 'film_and_tv'],
              Music: ['music'],
            }),
          )
        }
        return Promise.resolve(
          jsonResponse({
            // Only film_and_tv is present: Music must fall back to the
            // underscored alias with an undefined quizCount.
            byCategory: { film_and_tv: 120 },
            byDifficulty: { easy: 10, medium: 20, hard: 5, expert: 1 },
            byType: { text_choice: 100 },
            byState: {},
          }),
        )
      })
      vi.stubGlobal('fetch', fetchMock)

      const catalog = await provider().fetchCatalog()

      expect(catalog.difficulties).toEqual(['easy', 'medium', 'hard'])
      expect(catalog.topics).toHaveLength(1)
      expect(catalog.topics[0].slug).toBe('the-trivia-api')

      const byName = Object.fromEntries(
        catalog.topics[0].categories.map((c) => [c.name, c]),
      )
      // Canonical slug won: film_and_tv is the one present in byCategory.
      expect(byName['Film & TV'].slug).toBe('film_and_tv')
      expect(byName['Film & TV'].quizCount).toBe(120)
      // Music has no byCategory entry — falls back to the underscored
      // alias, quizCount stays undefined.
      expect(byName.Music.slug).toBe('music')
      expect(byName.Music.quizCount).toBeUndefined()
    })

    it('still serves categories when metadata fails', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/categories')) {
          return Promise.resolve(jsonResponse({ Music: ['music'] }))
        }
        return Promise.resolve(new Response('{}', { status: 500 }))
      })
      vi.stubGlobal('fetch', fetchMock)

      const catalog = await provider().fetchCatalog()

      expect(catalog.topics[0].categories).toHaveLength(1)
      // No metadata → no difficulty list to report.
      expect(catalog.difficulties).toEqual([])
    })

    it('fails as a typed error when categories are unreachable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('{}', { status: 503 })),
      )

      const error = (await provider()
        .fetchCatalog()
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('http')
      expect(error.status).toBe(503)
    })
  })
})
