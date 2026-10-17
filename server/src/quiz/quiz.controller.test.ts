/**
 * QuizController — supertest integration over the real HTTP stack.
 *
 * The providers run real `fetch` against a throwaway localhost
 * upstream (test-upstream.ts), so these tests cover the wiring the
 * unit tests cannot: query validation, auth-header forwarding, the
 * catalog cache, and — most importantly — every branch of the typed
 * error envelope the client's provider-switch policy keys off.
 *
 * The discriminator between the two response shapes:
 *   - success        → { questions | difficulties, ... }
 *   - provider error → { error: { kind, providerId, ... } }  (object)
 *   - bad request    → { error: 'Bad Request', ... }         (string)
 */

import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { AppModule } from '../app.module'
import { createTestApp } from '../test-app'
import {
  sendJson,
  startUpstream,
  type TestUpstream,
  type UpstreamHandler,
} from './test-upstream'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const quizApiQuestion = {
  id: 'q1',
  text: 'What is 2+2?',
  difficulty: 'EASY',
  explanation: '2 + 2 = 4',
  category: 'Mathematics',
  answers: [
    { id: 'a1', text: '3', isCorrect: false },
    { id: 'a2', text: '4', isCorrect: true },
    { id: 'a3', text: '5', isCorrect: false },
    { id: 'a4', text: '6', isCorrect: false },
  ],
}

const triviaQuestion = {
  id: 't1',
  question: { text: 'Capital of France?' },
  correctAnswer: 'Paris',
  incorrectAnswers: ['London', 'Berlin', 'Madrid'],
  category: 'Geography',
  difficulty: 'easy',
}

/** quizapi /categories — one usable topic, one emptied by the filter. */
const quizApiCategories = {
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
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** Env values clobbered by a test, restored after it. */
const savedEnv: Record<string, string | undefined> = {}

function setEnv(values: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(values)) {
    // Only the pre-test original is worth remembering, even if a test
    // sets the same key twice.
    if (!(key in savedEnv)) savedEnv[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
    delete savedEnv[key]
  }
}

describe('QuizController (e2e)', () => {
  let app: INestApplication | undefined
  let upstream: TestUpstream | undefined

  afterEach(async () => {
    // Close the app first: it may still hold an in-flight upstream
    // request (the timeout branch), and the upstream must outlive it.
    await app?.close()
    app = undefined
    await upstream?.close()
    upstream = undefined
    restoreEnv()
  })

  /** Boot the full AppModule under the real /api prefix. */
  async function boot(
    env: Record<string, string | undefined> = {},
  ): Promise<INestApplication> {
    // Must happen before compile(): the registry factory reads env when
    // the module instantiates its providers.
    setEnv(env)

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = await createTestApp(moduleRef)
    return app
  }

  /** Boot with both providers pointed at a local upstream. */
  async function bootWithUpstream(
    handler: UpstreamHandler,
    extraEnv: Record<string, string | undefined> = {},
  ): Promise<void> {
    upstream = await startUpstream(handler)
    await boot({
      QUIZAPI_KEY: 'test-key',
      QUIZAPI_BASE_URL: `${upstream.origin}/quizapi`,
      TRIVIA_BASE_URL: `${upstream.origin}/trivia`,
      ...extraEnv,
    })
  }

  function api(): ReturnType<typeof request> {
    if (!app) throw new Error('boot() the app before requesting')
    return request(app.getHttpServer())
  }

  function questionsUrl(rawUrl: string): URL {
    // The captured url is a path+query; any origin will do for parsing.
    return new URL(rawUrl, 'http://upstream.invalid')
  }

  // -------------------------------------------------------------------------
  // Success paths
  // -------------------------------------------------------------------------

  it('questions (quizapi): adapts the page and forwards query + auth upstream', async () => {
    await bootWithUpstream((_req, res) =>
      sendJson(res, 200, {
        success: true,
        data: [quizApiQuestion],
        meta: { total: 57 },
      }),
    )

    const response = await api().get('/api/quiz/questions').query({
      provider: 'quizapi',
      category: 'physics',
      difficulty: 'easy',
      limit: 10,
      offset: 20,
    })

    expect(response.status).toBe(200)
    expect(response.body.total).toBe(57)
    expect(response.body.questions).toHaveLength(1)
    expect(response.body.questions[0]).toMatchObject({
      id: 'q1',
      text: 'What is 2+2?',
      explanation: '2 + 2 = 4',
      category: 'Mathematics',
      difficulty: 'easy',
      multiple: false,
      correctOptionIds: ['a2'],
    })
    expect(response.body.questions[0].options).toHaveLength(4)

    // The upstream saw the auth header and the forwarded paging params.
    expect(upstream?.requests).toHaveLength(1)
    const received = upstream!.requests[0]
    expect(received.headers.authorization).toBe('Bearer test-key')
    const params = questionsUrl(received.url).searchParams
    expect(params.get('category')).toBe('physics')
    expect(params.get('difficulty')).toBe('EASY')
    expect(params.get('limit')).toBe('10')
    expect(params.get('offset')).toBe('20')
    expect(params.get('random')).toBe('true')
  })

  it('questions (trivia): merges the count and always asks for text_choice', async () => {
    await bootWithUpstream((req, res) => {
      if (req.url?.startsWith('/trivia/questions/count')) {
        sendJson(res, 200, { count: 42 })
        return
      }
      sendJson(res, 200, [triviaQuestion])
    })

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'trivia', difficulty: 'easy', limit: 10 })

    expect(response.status).toBe(200)
    expect(response.body.total).toBe(42)
    expect(response.body.questions).toHaveLength(1)
    expect(response.body.questions[0].correctOptionIds).toHaveLength(1)

    const page = upstream!.requests.find((r) =>
      r.url.startsWith('/trivia/questions?'),
    )
    expect(page).toBeDefined()
    const params = questionsUrl(page!.url).searchParams
    expect(params.get('types')).toBe('text_choice')
    expect(params.get('limit')).toBe('10')
    expect(params.get('offset')).toBe('0')
  })

  it('catalog (quizapi): one request yields narrowed difficulties and pruned topics', async () => {
    await bootWithUpstream((req, res) => {
      if (req.url?.startsWith('/quizapi/metadata')) {
        sendJson(res, 200, {
          success: true,
          data: { difficulties: ['EASY', 'MEDIUM', 'EXPERT'] },
        })
        return
      }
      sendJson(res, 200, quizApiCategories)
    })

    const response = await api()
      .get('/api/quiz/catalog')
      .query({ provider: 'quizapi' })

    expect(response.status).toBe(200)
    // EXPERT dropped, order preserved.
    expect(response.body.difficulties).toEqual(['easy', 'medium'])
    expect(response.body.topics).toHaveLength(1)
    expect(response.body.topics[0].slug).toBe('science')
    // quizCount 0 is pruned, and the topic it emptied disappears too.
    expect(response.body.topics[0].categories).toEqual([
      { id: 'c1', name: 'Physics', slug: 'physics', quizCount: 3 },
    ])
    // Only the fields the UI renders — no icon, tags, stats, …
    expect(Object.keys(response.body)).toEqual(['difficulties', 'topics'])
  })

  it('catalog (trivia): one topic enriched by metadata', async () => {
    await bootWithUpstream((req, res) => {
      if (req.url?.startsWith('/trivia/metadata')) {
        sendJson(res, 200, {
          byCategory: { film_and_tv: 120 },
          byDifficulty: { easy: 10, medium: 20, hard: 5 },
          byType: { text_choice: 100 },
          byState: {},
        })
        return
      }
      sendJson(res, 200, {
        'Film & TV': ['movies', 'film_and_tv'],
        Music: ['music'],
      })
    })

    const response = await api()
      .get('/api/quiz/catalog')
      .query({ provider: 'trivia' })

    expect(response.status).toBe(200)
    expect(response.body.difficulties).toEqual(['easy', 'medium', 'hard'])
    expect(response.body.topics).toHaveLength(1)
    expect(response.body.topics[0].slug).toBe('the-trivia-api')

    const byName = Object.fromEntries(
      response.body.topics[0].categories.map((c: { name: string }) => [
        c.name,
        c,
      ]),
    )
    // The alias present in metadata wins as canonical slug.
    expect(byName['Film & TV'].slug).toBe('film_and_tv')
    expect(byName['Film & TV'].quizCount).toBe(120)
    // No metadata entry → falls back, quizCount stays absent.
    expect(byName.Music.slug).toBe('music')
    expect(byName.Music.quizCount).toBeUndefined()
  })

  it('catalog: served from cache, so the upstream is hit only once', async () => {
    await bootWithUpstream((req, res) => {
      // Each provider answers with its own shape; the path prefix
      // (set in bootWithUpstream) tells them apart.
      if (req.url?.startsWith('/trivia/metadata')) {
        sendJson(res, 200, {
          byCategory: {},
          byDifficulty: { easy: 1 },
          byType: {},
          byState: {},
        })
        return
      }
      if (req.url?.startsWith('/trivia/')) {
        sendJson(res, 200, { Music: ['music'] })
        return
      }
      if (req.url?.startsWith('/quizapi/metadata')) {
        sendJson(res, 200, {
          success: true,
          data: { difficulties: ['EASY'] },
        })
        return
      }
      sendJson(res, 200, quizApiCategories)
    })

    await api()
      .get('/api/quiz/catalog')
      .query({ provider: 'quizapi' })
      .expect(200)
    await api()
      .get('/api/quiz/catalog')
      .query({ provider: 'quizapi' })
      .expect(200)

    // Same provider → one upstream round-trip, second read is cached.
    const quizApiMetadataHits = upstream!.requests.filter((r) =>
      r.url.startsWith('/quizapi/metadata'),
    )
    expect(quizApiMetadataHits).toHaveLength(1)

    // A different provider is a different cache entry — still live.
    await api()
      .get('/api/quiz/catalog')
      .query({ provider: 'trivia' })
      .expect(200)
    const triviaHits = upstream!.requests.filter((r) =>
      r.url.startsWith('/trivia/'),
    )
    expect(triviaHits.length).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------------------
  // Error envelope — the provider-switch contract
  // -------------------------------------------------------------------------

  it('upstream 401 → 401 with kind auth', async () => {
    await bootWithUpstream((_req, res) => sendJson(res, 401, {}))

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'easy' })

    expect(response.status).toBe(401)
    expect(response.body.error).toMatchObject({
      kind: 'auth',
      providerId: 'quizapi',
      status: 401,
      message: 'QuizAPI error: HTTP 401',
    })
    expect(response.body.error.retryAfter).toBeUndefined()
  })

  it('upstream 429 → 429 with kind rate_limit and Retry-After forwarded', async () => {
    await bootWithUpstream((_req, res) =>
      sendJson(res, 429, {}, { 'Retry-After': '90' }),
    )

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'easy' })

    expect(response.status).toBe(429)
    // Header on the proxy's own response, not just in the body.
    expect(response.headers['retry-after']).toBe('90')
    expect(response.body.error).toMatchObject({
      kind: 'rate_limit',
      providerId: 'quizapi',
      status: 429,
      retryAfter: 90,
      // The dialog shows it verbatim — no bare status code for users.
      message: 'Rate limit exceeded. Try again in 90s.',
    })
  })

  it('upstream 500 → 500 with kind http', async () => {
    await bootWithUpstream((_req, res) => sendJson(res, 500, {}))

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'easy' })

    expect(response.status).toBe(500)
    expect(response.body.error).toMatchObject({
      kind: 'http',
      providerId: 'quizapi',
      status: 500,
    })
  })

  it('non-JSON upstream body → 502 with kind parse', async () => {
    await bootWithUpstream((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('<html>captive portal</html>')
    })

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'easy' })

    // The upstream answered, just not in JSON: the client must switch
    // (parse), not retry a provider that keeps serving garbage.
    expect(response.status).toBe(502)
    expect(response.body.error).toMatchObject({
      kind: 'parse',
      providerId: 'quizapi',
    })
    expect(response.body.error.status).toBeUndefined()
  })

  it('hung upstream → 504 with kind timeout', async () => {
    // Handler never answers; the provider's abort deadline (150ms here)
    // is what must end the request.
    await bootWithUpstream(
      () => {
        /* hang */
      },
      { UPSTREAM_TIMEOUT_MS: '150' },
    )

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'easy' })

    expect(response.status).toBe(504)
    expect(response.body.error).toMatchObject({
      kind: 'timeout',
      providerId: 'quizapi',
    })
  })

  it('unreachable upstream → 502 with kind network', async () => {
    // Bind then release a port so the connection is refused rather than
    // routed to some other live server.
    const dead = await startUpstream(() => {})
    const deadOrigin = dead.origin
    await dead.close()

    await boot({
      QUIZAPI_KEY: 'test-key',
      QUIZAPI_BASE_URL: `${deadOrigin}/quizapi`,
      TRIVIA_BASE_URL: `${deadOrigin}/trivia`,
    })

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'easy' })

    expect(response.status).toBe(502)
    expect(response.body.error).toMatchObject({
      kind: 'network',
      providerId: 'quizapi',
    })
  })

  it('missing QUIZAPI_KEY → 401 auth without ever reaching upstream', async () => {
    await bootWithUpstream((_req, res) => sendJson(res, 200, []), {
      QUIZAPI_KEY: undefined,
    })

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'easy' })

    expect(response.status).toBe(401)
    expect(response.body.error).toMatchObject({
      kind: 'auth',
      providerId: 'quizapi',
    })
    expect(upstream?.requests).toHaveLength(0)
  })

  it('trivia failure carries providerId trivia', async () => {
    await bootWithUpstream((_req, res) =>
      sendJson(res, 429, {}, { 'Retry-After': '30' }),
    )

    const response = await api()
      .get('/api/quiz/catalog')
      .query({ provider: 'trivia' })

    expect(response.status).toBe(429)
    expect(response.body.error).toMatchObject({
      kind: 'rate_limit',
      providerId: 'trivia',
      retryAfter: 30,
    })
  })

  // -------------------------------------------------------------------------
  // Validation — a bad request is the client's fault, never a provider error
  // -------------------------------------------------------------------------

  it('unknown difficulty → 400 with the standard body, not the envelope', async () => {
    await bootWithUpstream((_req, res) => sendJson(res, 200, []))

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'impossible' })

    expect(response.status).toBe(400)
    // Nest's shape: `error` is a *string* here, an *object* in the envelope.
    expect(response.body.error).toBe('Bad Request')
    expect(response.body.statusCode).toBe(400)
    expect(upstream?.requests).toHaveLength(0)
  })

  it('missing provider → 400', async () => {
    await bootWithUpstream((_req, res) => sendJson(res, 200, []))

    const response = await api()
      .get('/api/quiz/questions')
      .query({ difficulty: 'easy' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Bad Request')
  })

  it('malformed or out-of-range limit → 400 rather than a silent default', async () => {
    await bootWithUpstream((_req, res) => sendJson(res, 200, []))

    for (const limit of ['abc', '0', '-5']) {
      const response = await api()
        .get('/api/quiz/questions')
        .query({ provider: 'quizapi', difficulty: 'easy', limit })

      expect(response.status, `limit=${limit}`).toBe(400)
      expect(response.body.error).toBe('Bad Request')
    }
    expect(upstream?.requests).toHaveLength(0)
  })

  it('omitted limit/offset/category fall back to defaults', async () => {
    await bootWithUpstream((_req, res) =>
      sendJson(res, 200, { success: true, data: [quizApiQuestion] }),
    )

    const response = await api()
      .get('/api/quiz/questions')
      .query({ provider: 'quizapi', difficulty: 'easy' })

    expect(response.status).toBe(200)
    const params = questionsUrl(upstream!.requests[0].url).searchParams
    expect(params.get('limit')).toBe('10')
    expect(params.get('offset')).toBe('0')
    expect(params.has('category')).toBe(false)
  })

  it('unknown provider → 400', async () => {
    await bootWithUpstream((_req, res) => sendJson(res, 200, []))

    const response = await api()
      .get('/api/quiz/catalog')
      .query({ provider: 'mock' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Bad Request')
  })
})
