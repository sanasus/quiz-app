/**
 * QuizAPI provider — proxies https://quizapi.io/api/v1.
 *
 * Auth: Authorization: Bearer <QUIZAPI_KEY>. The key lives only on the
 * server (it never reaches the client bundle any more).
 *
 * Ported from the frontend's quizapi-client.ts. The upstream
 * request/parse/validate shape is unchanged; what moved is *where* the
 * failures are classified — here they become UpstreamError with a
 * coarse kind, so the client's provider-switch policy can act on them
 * without re-guessing.
 */

import type { Catalog, QuestionsPage, QuestionsQuery } from '../types'
import { UpstreamError, classifyUpstream, upstreamHttpError } from '../errors'
import { adaptQuestion } from '../upstream/adapt-quizapi'
import { QUIZAPI_BASE_URL, REQUEST_TIMEOUT_MS } from '../upstream/constants'
import { narrowDifficulties } from '../upstream/difficulties'
import {
  quizApiCategoriesResponseSchema,
  quizApiMetaSchema,
  quizApiMetadataResponseSchema,
  quizApiQuestionSchema,
} from '../upstream/quizapi.schemas'
import type { QuizProvider } from './provider.interface'

export interface QuizApiProviderOptions {
  /** QuizAPI key. Empty/absent → every request fails as `auth`. */
  apiKey: string | undefined
  /** Overridable for tests. */
  baseUrl?: string
  /** Upstream abort deadline; defaults to REQUEST_TIMEOUT_MS. */
  timeoutMs?: number
}

export class QuizApiProvider implements QuizProvider {
  readonly id = 'quizapi' as const

  private readonly apiKey: string | undefined
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(options: QuizApiProviderOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? QUIZAPI_BASE_URL
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS
  }

  async fetchQuestions(query: QuestionsQuery): Promise<QuestionsPage> {
    try {
      const response = await this.request(this.buildQuestionsUrl(query))

      if (!response.ok) {
        throw upstreamHttpError('QuizAPI', response)
      }

      const json: unknown = await response.json()

      // The API returns { success: true, data: [...], meta: { total } }
      const rawArray = (json as { data?: unknown }).data ?? []
      const metaResult = quizApiMetaSchema.safeParse(
        (json as { meta?: unknown }).meta,
      )
      const total = metaResult.success ? metaResult.data.total : undefined

      if (!Array.isArray(rawArray) || rawArray.length === 0) {
        // Running past the end of the pool is a normal outcome for a
        // survival batch (offset > 0): an empty page means "exhausted",
        // not an error. An empty *initial* fetch is a config problem.
        if (query.offset > 0) return { questions: [], total }
        throw new UpstreamError(
          'parse',
          'No questions returned from API. Try different settings.',
        )
      }

      // Validate each item — invalid ones are dropped, not fatal.
      const valid = []
      for (const raw of rawArray) {
        const parseResult = quizApiQuestionSchema.safeParse(raw)
        if (!parseResult.success) continue
        const adapted = adaptQuestion(parseResult.data)
        if (adapted !== null) valid.push(adapted)
      }

      if (valid.length === 0) {
        throw new UpstreamError(
          'parse',
          'API returned questions but none passed validation. Check API key and settings.',
        )
      }

      return { questions: valid, total }
    } catch (error) {
      throw classifyUpstream(error)
    }
  }

  async fetchCatalog(): Promise<Catalog> {
    try {
      const [metadata, topics] = await Promise.all([
        this.fetchMetadata(),
        this.fetchTopics(),
      ])

      return { difficulties: narrowDifficulties(metadata), topics }
    } catch (error) {
      throw classifyUpstream(error)
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /** /questions — pure, so unit-tested like the former buildQuestionsUrl. */
  buildQuestionsUrl(query: QuestionsQuery): string {
    const params = new URLSearchParams({
      limit: String(query.limit),
      difficulty: query.difficulty.toUpperCase(),
      random: 'true',
      offset: String(query.offset),
    })

    if (query.category && query.category !== 'all') {
      params.set('category', query.category)
    }

    return `${this.baseUrl}/questions?${params.toString()}`
  }

  /** Upstream difficulty list (pre-narrowing). */
  private async fetchMetadata(): Promise<string[]> {
    const response = await this.request(`${this.baseUrl}/metadata`)

    if (!response.ok) {
      throw upstreamHttpError('QuizAPI metadata', response)
    }

    const parsed = quizApiMetadataResponseSchema.safeParse(
      await response.json(),
    )
    if (!parsed.success) {
      throw new UpstreamError(
        'parse',
        `Invalid metadata response: ${parsed.error.message}`,
        { cause: parsed.error },
      )
    }

    return parsed.data.data.difficulties
  }

  /** /categories — filtered to categories that actually have quizzes. */
  private async fetchTopics(): Promise<Catalog['topics']> {
    const response = await this.request(`${this.baseUrl}/categories`)

    if (!response.ok) {
      throw upstreamHttpError('QuizAPI categories', response)
    }

    const parsed = quizApiCategoriesResponseSchema.safeParse(
      await response.json(),
    )
    if (!parsed.success) {
      throw new UpstreamError(
        'parse',
        `Invalid categories response: ${parsed.error.message}`,
        { cause: parsed.error },
      )
    }

    return parsed.data.data
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        categories: topic.categories
          .filter((cat) => cat.quizCount != null && cat.quizCount > 0)
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            quizCount: cat.quizCount,
          })),
      }))
      .filter((topic) => topic.categories.length > 0)
  }

  /** Upstream fetch with auth + timeout; a missing key fails as `auth`. */
  private async request(url: string): Promise<Response> {
    if (!this.apiKey) {
      throw new UpstreamError(
        'auth',
        'QUIZAPI_KEY is not set. Add it to the server environment (.env).',
      )
    }

    return fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(this.timeoutMs),
    })
  }
}
