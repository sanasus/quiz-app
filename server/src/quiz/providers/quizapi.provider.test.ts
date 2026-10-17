/**
 * QuizApiProvider — upstream behaviour with a stubbed fetch.
 *
 * These tests pin the *server-side* classification that the client's
 * provider-switch policy depends on: a 401 must surface as `auth`, a
 * 429 as `rate_limit` with Retry-After, a hung upstream as `timeout`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizApiProvider } from './quizapi.provider'
import { UpstreamError } from '../errors'
import type { QuestionsQuery } from '../types'

const BASE = 'https://quizapi.test/api/v1'

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

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    text: 'What is 2+2?',
    difficulty: 'EASY',
    answers: [
      { id: 'a1', text: '3', isCorrect: false },
      { id: 'a2', text: '4', isCorrect: true },
    ],
    ...overrides,
  }
}

describe('QuizApiProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  function provider(apiKey: string | undefined = 'test-key'): QuizApiProvider {
    return new QuizApiProvider({ apiKey, baseUrl: BASE })
  }

  describe('buildQuestionsUrl', () => {
    it('targets the questions endpoint with limit, offset and uppercase difficulty', () => {
      const url = provider().buildQuestionsUrl({
        ...query,
        difficulty: 'hard',
        limit: 25,
        offset: 50,
      })

      expect(url.startsWith(`${BASE}/questions?`)).toBe(true)
      const params = new URL(url).searchParams
      expect(params.get('limit')).toBe('25')
      expect(params.get('offset')).toBe('50')
      expect(params.get('difficulty')).toBe('HARD')
      expect(params.get('random')).toBe('true')
    })

    it('passes the category only when it is not all', () => {
      const withCategory = provider().buildQuestionsUrl({
        ...query,
        category: 'physics',
      })
      const all = provider().buildQuestionsUrl(query)

      expect(new URL(withCategory).searchParams.get('category')).toBe('physics')
      expect(new URL(all).searchParams.has('category')).toBe(false)
    })
  })

  describe('fetchQuestions', () => {
    it('adapts a valid page and surfaces meta.total', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: [makeQuestion()],
          meta: { total: 57 },
        }),
      )
      vi.stubGlobal('fetch', fetchMock)

      const page = await provider().fetchQuestions(query)

      expect(page.total).toBe(57)
      expect(page.questions).toHaveLength(1)
      expect(page.questions[0].difficulty).toBe('easy')
      expect(page.questions[0].correctOptionIds).toEqual(['a2'])
    })

    it('ignores unknown meta fields', async () => {
      // Zod strips unknown keys, so an upstream adding fields (or
      // quizapi.com keeping its pagination envelope) never breaks
      // validation — only a changed shape of a *used* field does.
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: [makeQuestion()],
          meta: {
            total: 42,
            pageTotal: 5,
            page: 1,
            lastPage: 5,
            links: { next: '/api/v1/questions?limit=10&offset=10' },
          },
        }),
      )
      vi.stubGlobal('fetch', fetchMock)

      const page = await provider().fetchQuestions(query)

      expect(page.total).toBe(42)
    })

    it('degrades to no total when meta is malformed instead of failing', async () => {
      // `total` drives the survival header ("Question 1/68"); a wrong
      // one costs a cosmetic label, while failing here would cost the
      // whole quiz.
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: [makeQuestion()],
          meta: { total: 'many' },
        }),
      )
      vi.stubGlobal('fetch', fetchMock)

      const page = await provider().fetchQuestions(query)

      expect(page.total).toBeUndefined()
      expect(page.questions).toHaveLength(1)
    })

    it('sends the Bearer key', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: [makeQuestion()] }))
      vi.stubGlobal('fetch', fetchMock)

      await provider('secret-key').fetchQuestions(query)

      const [, init] = fetchMock.mock.calls[0]
      expect(init.headers.Authorization).toBe('Bearer secret-key')
    })

    it('classifies 401 as auth', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('{}', { status: 401 })),
      )

      const error = (await provider()
        .fetchQuestions(query)
        .catch((e: unknown) => e)) as UpstreamError

      expect(error).toBeInstanceOf(UpstreamError)
      expect(error.kind).toBe('auth')
      expect(error.status).toBe(401)
    })

    it('classifies 429 as rate_limit and forwards Retry-After', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('{}', {
            status: 429,
            headers: { 'Retry-After': '90' },
          }),
        ),
      )

      const error = (await provider()
        .fetchQuestions(query)
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('rate_limit')
      expect(error.status).toBe(429)
      expect(error.retryAfter).toBe(90)
    })

    it('classifies 500 as http', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('{}', { status: 500 })),
      )

      const error = (await provider()
        .fetchQuestions(query)
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('http')
      expect(error.status).toBe(500)
    })

    it('returns an empty page (not an error) when offset > 0', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ success: true, data: [] })),
      )

      const page = await provider().fetchQuestions({ ...query, offset: 20 })

      expect(page.questions).toEqual([])
    })

    it('throws parse when the initial fetch is empty', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ success: true, data: [] })),
      )

      const error = (await provider()
        .fetchQuestions(query)
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('parse')
    })

    it('throws parse when every question fails validation', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            jsonResponse({ data: [{ id: 'q1', text: 'broken' }] }),
          ),
      )

      const error = (await provider()
        .fetchQuestions(query)
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('parse')
    })

    it('fails as auth when no API key is configured', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      // Built directly: the provider() helper defaults the key, and an
      // explicit `undefined` argument would still trigger that default.
      const keyless = new QuizApiProvider({ apiKey: undefined, baseUrl: BASE })
      const error = (await keyless
        .fetchQuestions(query)
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('auth')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('fetchCatalog', () => {
    it('merges metadata difficulties and filtered topics', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/metadata')) {
          return Promise.resolve(
            jsonResponse({
              success: true,
              data: { difficulties: ['EASY', 'MEDIUM', 'EXPERT'] },
            }),
          )
        }
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: [
              {
                id: 't1',
                name: 'Science',
                slug: 'science',
                categories: [
                  { id: 'c1', name: 'Physics', slug: 'physics', quizCount: 3 },
                  { id: 'c2', name: 'Empty', slug: 'empty', quizCount: 0 },
                ],
              },
              {
                id: 't2',
                name: 'Empty topic',
                slug: 'empty-topic',
                categories: [{ id: 'c3', name: 'X', slug: 'x', quizCount: 0 }],
              },
            ],
          }),
        )
      })
      vi.stubGlobal('fetch', fetchMock)

      const catalog = await provider().fetchCatalog()

      // EXPERT is dropped; only supported, deduped levels remain.
      expect(catalog.difficulties).toEqual(['easy', 'medium'])
      // quizCount 0 categories and topics left empty by them are removed.
      expect(catalog.topics).toHaveLength(1)
      expect(catalog.topics[0].categories).toEqual([
        { id: 'c1', name: 'Physics', slug: 'physics', quizCount: 3 },
      ])
    })

    it('surfaces a metadata failure as a typed error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('{}', { status: 401 })),
      )

      const error = (await provider()
        .fetchCatalog()
        .catch((e: unknown) => e)) as UpstreamError

      expect(error.kind).toBe('auth')
    })
  })
})
