/**
 * The Trivia API provider — proxies https://the-trivia-api.com/v2.
 * Keyless. Licence: CC BY-NC 4.0 — attribution lives in the app footer.
 *
 * Ported from the frontend's triviaapi.ts. Live-verified quirks are
 * preserved:
 * - `limit` caps at 50; `offset` is currently ignored by the server, so
 *   pool exhaustion is detected client-side by deduplicating by id.
 * - `types=text_choice` is always sent: `text_input` 401s keylessly.
 * - An unknown `categories` slug is silently swapped for
 *   general_knowledge by the API, so the parameter is only sent when the
 *   configured category maps to a known trivia slug.
 */

import type { Catalog, QuestionsPage, QuestionsQuery } from '../types'
import { UpstreamError, classifyUpstream, upstreamHttpError } from '../errors'
import { adaptTriviaQuestion } from '../upstream/adapt-trivia'
import {
  pickCanonicalSlug,
  resolveTriviaCategory,
} from '../upstream/category-mapping'
import {
  REQUEST_TIMEOUT_MS,
  TRIVIA_BASE_URL,
  TRIVIA_MAX_LIMIT,
  TRIVIA_QUESTION_TYPE,
} from '../upstream/constants'
import { Logger } from '@nestjs/common'
import { narrowDifficulties } from '../upstream/difficulties'
import {
  triviaApiCategoriesSchema,
  triviaApiCountSchema,
  triviaApiMetadataSchema,
  triviaApiQuestionSchema,
} from '../upstream/trivia.schemas'
import type { TriviaApiMetadata } from '../upstream/trivia.schemas'
import type { QuizProvider } from './provider.interface'

export interface TriviaProviderOptions {
  /** Overridable for tests. */
  baseUrl?: string
  /** Upstream abort deadline; defaults to REQUEST_TIMEOUT_MS. */
  timeoutMs?: number
}

export class TriviaProvider implements QuizProvider {
  readonly id = 'trivia' as const

  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly logger = new Logger(TriviaProvider.name)

  constructor(options: TriviaProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? TRIVIA_BASE_URL
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS
  }

  async fetchQuestions(query: QuestionsQuery): Promise<QuestionsPage> {
    try {
      // The count races the questions request; its failure degrades to
      // `total: undefined` (survival then shows no pool size) instead of
      // failing the whole page.
      const [count, response] = await Promise.all([
        query.offset === 0
          ? this.fetchCount(query)
          : Promise.resolve(undefined),
        fetch(this.buildQuestionsUrl(query), {
          signal: AbortSignal.timeout(this.timeoutMs),
        }),
      ])

      if (!response.ok) {
        throw upstreamHttpError('The Trivia API', response)
      }

      const json: unknown = await response.json()

      if (!Array.isArray(json)) {
        throw new UpstreamError(
          'parse',
          'Invalid questions response from The Trivia API.',
        )
      }

      const questions = []
      for (const item of json) {
        const parsed = triviaApiQuestionSchema.safeParse(item)
        if (!parsed.success) continue
        const question = adaptTriviaQuestion(parsed.data)
        if (question !== null) questions.push(question)
      }

      // An empty page at offset > 0 means the pool is exhausted — a
      // normal outcome for a survival batch, while an empty *initial*
      // fetch is a config problem.
      if (questions.length === 0 && query.offset === 0) {
        throw new UpstreamError(
          'parse',
          'No questions returned from The Trivia API. Try different settings.',
        )
      }

      return { questions, total: count }
    } catch (error) {
      throw classifyUpstream(error)
    }
  }

  async fetchCatalog(): Promise<Catalog> {
    try {
      // Metadata supplies quizCount and canonical slugs, but the
      // categories are still usable without it — it is fetched best
      // effort, mirroring the frontend's non-fatal count race.
      const [record, metadata] = await Promise.all([
        this.fetchCategoriesRecord(),
        this.fetchMetadata().catch(() => undefined),
      ])

      const byCategory = metadata?.byCategory
      const flatCategories: Catalog['topics'][number]['categories'] = []

      for (const [name, slugs] of Object.entries(record)) {
        const slug = pickCanonicalSlug(slugs, byCategory)
        flatCategories.push({
          id: slug,
          name,
          slug,
          quizCount: byCategory?.[slug],
        })
      }

      return {
        difficulties: narrowDifficulties(
          Object.keys(metadata?.byDifficulty ?? {}),
        ),
        // One topic listing the 10 trivia categories.
        topics: [
          {
            id: 'the-trivia-api',
            name: 'The Trivia API',
            slug: 'the-trivia-api',
            categories: flatCategories,
          },
        ],
      }
    } catch (error) {
      throw classifyUpstream(error)
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /** /questions — pure, so unit-tested like the former URL builder. */
  buildQuestionsUrl(query: QuestionsQuery): string {
    const params = new URLSearchParams({
      limit: String(Math.min(query.limit, TRIVIA_MAX_LIMIT)),
      offset: String(query.offset),
      difficulties: query.difficulty,
      types: TRIVIA_QUESTION_TYPE,
    })

    const category = resolveTriviaCategory(query.category)
    if (category !== null) params.set('categories', category)

    return `${this.baseUrl}/questions?${params.toString()}`
  }

  /** /questions/count — exact pool size under the same filters. */
  private buildCountUrl(query: QuestionsQuery): string {
    const params = new URLSearchParams({
      difficulties: query.difficulty,
      types: TRIVIA_QUESTION_TYPE,
    })

    const category = resolveTriviaCategory(query.category)
    if (category !== null) params.set('categories', category)

    return `${this.baseUrl}/questions/count?${params.toString()}`
  }

  /**
   * Pool size under the same filters — never fatal: an undefined result
   * simply means the survival header shows no total.
   */
  private async fetchCount(query: QuestionsQuery): Promise<number | undefined> {
    try {
      const response = await fetch(this.buildCountUrl(query), {
        signal: AbortSignal.timeout(this.timeoutMs),
      })
      if (!response.ok) return undefined

      const parsed = triviaApiCountSchema.safeParse(await response.json())
      return parsed.success ? parsed.data.count : undefined
    } catch (error) {
      // Best effort: the catalog is still usable without a pool size,
      // so this must warn rather than fail the whole catalog call.
      this.logger.warn('The Trivia API count request failed', error)
      return undefined
    }
  }

  private async fetchCategoriesRecord(): Promise<Record<string, string[]>> {
    const response = await fetch(`${this.baseUrl}/categories`, {
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      throw upstreamHttpError('The Trivia API categories', response)
    }

    const parsed = triviaApiCategoriesSchema.safeParse(await response.json())
    if (!parsed.success) {
      throw new UpstreamError(
        'parse',
        `Invalid categories response: ${parsed.error.message}`,
        { cause: parsed.error },
      )
    }

    return parsed.data
  }

  private async fetchMetadata(): Promise<TriviaApiMetadata> {
    const response = await fetch(`${this.baseUrl}/metadata`, {
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      throw upstreamHttpError('The Trivia API metadata', response)
    }

    const parsed = triviaApiMetadataSchema.safeParse(await response.json())
    if (!parsed.success) {
      throw new UpstreamError(
        'parse',
        `Invalid metadata response: ${parsed.error.message}`,
        { cause: parsed.error },
      )
    }

    return parsed.data
  }
}
