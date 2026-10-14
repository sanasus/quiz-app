/**
 * The Trivia API client — fallback provider used when quizapi.io
 * fails (see the hybrid-integration task in quizapi.ts).
 *
 * Base URL: https://the-trivia-api.com/v2
 * Auth: none (free, CORS enabled). Licence: CC BY-NC 4.0 — attribution
 * lives in the app footer.
 *
 * Live-verified quirks this file pins down:
 * - `limit` caps at 50; `offset` is currently ignored by the server, so
 *   pool exhaustion is detected client-side by deduplicating by id.
 * - `types=text_choice` is always sent: `text_input` answers 401
 *   without an API key.
 * - An unknown `categories` slug is silently swapped for
 *   general_knowledge by the API, so the parameter is only sent when
 *   the configured category maps to a known trivia slug.
 */

import type {
  ApiMetadata,
  Category,
  Question,
  QuizConfig,
  Topic,
} from '../types/quiz'
import type { QuestionsPage } from './quizapi'
import type {
  TriviaApiCategories,
  TriviaApiMetadata,
  TriviaApiQuestion,
} from './schemas'
import {
  triviaApiCategoriesSchema,
  triviaApiCountSchema,
  triviaApiMetadataSchema,
  triviaApiQuestionSchema,
} from './schemas'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'https://the-trivia-api.com/v2'

/** Every request aborts after 10s — the fallback must never hang. */
const REQUEST_TIMEOUT_MS = 10_000

/** The API rejects `limit` above 50. */
const MAX_LIMIT = 50

/**
 * Always requested: the keyless `text_input` type returns 401, so only
 * `text_choice` works without an API key.
 */
const QUESTION_TYPE = 'text_choice'

// ---------------------------------------------------------------------------
// Category mapping: trivia slugs, their aliases and quizapi leaf slugs
// ---------------------------------------------------------------------------

/** The 10 categories /v2/metadata reports as `byCategory` keys. */
const TRIVIA_CANONICAL_SLUGS: readonly string[] = [
  'arts_and_literature',
  'film_and_tv',
  'food_and_drink',
  'general_knowledge',
  'geography',
  'history',
  'music',
  'science',
  'society_and_culture',
  'sport_and_leisure',
]

/** Alias slugs exposed by /v2/categories, grouped by canonical slug. */
const TRIVIA_ALIAS_GROUPS: Record<string, readonly string[]> = {
  arts_and_literature: ['arts', 'literature', 'novels'],
  film_and_tv: ['movies', 'film'],
  food_and_drink: ['food', 'drink', 'alcohol'],
  society_and_culture: ['society', 'culture'],
  sport_and_leisure: ['sports', 'sport', 'games'],
}

/**
 * QuizAPI leaf slugs (from a live /api/v1/categories response) grouped
 * by the trivia category they fall back to. Unmapped on purpose → null:
 * programming, devops-and-cloud, database, cybersecurity, mathematics,
 * business-and-finance and the pop-culture leaves video-games, comics,
 * celebrities, fashion (their topic has no trivia counterpart).
 */
const QUIZAPI_LEAF_GROUPS: Record<string, readonly string[]> = {
  science: [
    'physics',
    'chemistry',
    'biology',
    'astronomy',
    'earth-science',
    'genetics',
    'ecology',
    'neuroscience',
    'quantum-physics',
    'climate-science',
    'marine-biology',
    'paleontology',
  ],
  history: [
    'world-wars',
    'ancient-history',
    'medieval-history',
    'modern-history',
    'american-history',
    'european-history',
    'asian-history',
    'ancient-rome',
    'ancient-greece',
    'cold-war',
    'renaissance',
    'industrial-revolution',
  ],
  geography: [
    'world-capitals',
    'africa',
    'europe',
    'asia',
    'americas',
    'mountains',
    'rivers',
    'oceans',
    'countries',
    'flags',
  ],
  arts_and_literature: [
    'classic-literature',
    'shakespeare',
    'poetry',
    'modern-fiction',
    'science-fiction',
    'fantasy',
    'world-literature',
    'literary-devices',
    'nobel-laureates',
    'children-s-literature',
    'art-and-architecture',
  ],
  film_and_tv: ['movies', 'tv-shows', 'anime'],
  music: ['music'],
  sport_and_leisure: ['sports'],
  food_and_drink: ['food-and-drink'],
  general_knowledge: [
    'trivia',
    'fun-facts',
    'world-records',
    'inventions',
    'famous-people',
    'languages',
    'philosophy',
    'health-and-wellness',
  ],
  society_and_culture: ['mythology'],
}

/** Flat slug → canonical trivia slug lookup. */
const CATEGORY_BY_SLUG: Record<string, string> = buildCategoryLookup()

function buildCategoryLookup(): Record<string, string> {
  const lookup: Record<string, string> = {}
  for (const canonical of TRIVIA_CANONICAL_SLUGS) {
    lookup[canonical] = canonical
  }
  addGroupedSlugs(lookup, TRIVIA_ALIAS_GROUPS)
  addGroupedSlugs(lookup, QUIZAPI_LEAF_GROUPS)
  return lookup
}

function addGroupedSlugs(
  lookup: Record<string, string>,
  groups: Record<string, readonly string[]>,
): void {
  for (const [canonical, slugs] of Object.entries(groups)) {
    for (const slug of slugs) {
      lookup[slug] = canonical
    }
  }
}

/**
 * Map a quizapi category slug onto a canonical trivia slug.
 * `null` means "no category filter" — the whole pool: 'all', an empty
 * or undefined slug, or a quizapi topic the fallback has no questions
 * for (programming, devops, database, …).
 */
export function resolveTriviaCategory(slug: string | undefined): string | null {
  if (!slug || slug === 'all') return null
  return CATEGORY_BY_SLUG[slug] ?? null
}

// ---------------------------------------------------------------------------
// URL builders (pure — unit-tested, like buildQuestionsUrl in quizapi.ts)
// ---------------------------------------------------------------------------

/** One page of questions. `limit` is clamped to the API's hard cap. */
export function buildTriviaQuestionsUrl(
  config: QuizConfig,
  options: { limit: number; offset: number },
): string {
  const params = new URLSearchParams({
    limit: String(Math.min(options.limit, MAX_LIMIT)),
    offset: String(options.offset),
    difficulties: config.difficulty,
    types: QUESTION_TYPE,
  })

  const category = resolveTriviaCategory(config.category)
  if (category !== null) params.set('categories', category)

  return `${API_BASE}/questions?${params.toString()}`
}

/** Exact pool size under the same filters (QuizAPI's `meta.total`). */
export function buildTriviaCountUrl(config: QuizConfig): string {
  const params = new URLSearchParams({
    difficulties: config.difficulty,
    types: QUESTION_TYPE,
  })

  const category = resolveTriviaCategory(config.category)
  if (category !== null) params.set('categories', category)

  return `${API_BASE}/questions/count?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Adapter: raw trivia question → internal Question model
// ---------------------------------------------------------------------------

/** Fisher–Yates shuffle (in place, returns the same array). */
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swapped = items[i]
    items[i] = items[j]
    items[j] = swapped
  }
  return items
}

/**
 * Adapt a single raw trivia question to the internal model.
 * Returns `null` for unusable questions (empty or duplicated answers
 * leaving fewer than two distinct options) — the caller filters them.
 */
export function adaptTriviaQuestion(raw: TriviaApiQuestion): Question | null {
  const shuffled = shuffle([raw.correctAnswer, ...raw.incorrectAnswers])

  // Drop empty/whitespace-only answers, then dedupe by text keeping the
  // first occurrence after the shuffle.
  const seen = new Set<string>()
  const texts = shuffled.filter((text) => {
    if (text.trim() === '') return false
    if (seen.has(text)) return false
    seen.add(text)
    return true
  })

  if (texts.length < 2) return null

  // Option ids are synthesised after the shuffle, so they always match
  // the final (deduped) option list.
  const options = texts.map((text, index) => ({
    id: `${raw.id}-${index}`,
    text,
  }))
  const correctOptionIds = options
    .filter((option) => option.text === raw.correctAnswer)
    .map((option) => option.id)

  // The correct answer itself was empty/dropped — unusable question.
  if (correctOptionIds.length === 0) return null

  return {
    id: raw.id,
    text: raw.question.text,
    options,
    correctOptionIds,
    multiple: false,
    explanation: undefined,
    category: raw.category,
    difficulty: raw.difficulty,
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

/**
 * Pool size under the same filters — non-fatal by design: it races the
 * questions request inside Promise.all, so every failure degrades to
 * `undefined` (survival then shows no total) instead of failing the page.
 */
async function fetchTriviaCount(
  config: QuizConfig,
): Promise<number | undefined> {
  try {
    const response = await fetch(buildTriviaCountUrl(config), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return undefined

    const json: unknown = await response.json()
    const parsed = triviaApiCountSchema.safeParse(json)
    return parsed.success ? parsed.data.count : undefined
  } catch (error) {
    console.warn('The Trivia API count request failed:', error)
    return undefined
  }
}

/**
 * Fetch one page of questions plus the pool size (only requested for
 * offset 0 — the count never changes within a session).
 */
export async function fetchTriviaQuestions(
  config: QuizConfig,
  options: { limit: number; offset: number },
): Promise<QuestionsPage> {
  const [count, response] = await Promise.all([
    options.offset === 0
      ? fetchTriviaCount(config)
      : Promise.resolve(undefined),
    fetch(buildTriviaQuestionsUrl(config, options), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
  ])

  if (!response.ok) {
    throw new Error(`The Trivia API error: HTTP ${response.status}`)
  }

  const json: unknown = await response.json()

  if (!Array.isArray(json)) {
    throw new Error('Invalid questions response from The Trivia API.')
  }

  const questions: Question[] = []
  for (const item of json) {
    const parsed = triviaApiQuestionSchema.safeParse(item)
    if (!parsed.success) continue
    const question = adaptTriviaQuestion(parsed.data)
    if (question !== null) questions.push(question)
  }

  // An empty page at offset > 0 means the pool is exhausted (the store
  // dedupes by id) — a normal outcome for a survival batch, while an
  // empty *initial* fetch is a config problem.
  if (questions.length === 0 && options.offset === 0) {
    throw new Error(
      'No questions returned from The Trivia API. Try different settings.',
    )
  }

  return { questions, total: count }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/** Raw /v2/metadata payload (kept separate: categories need byCategory). */
async function fetchTriviaRawMetadata(): Promise<TriviaApiMetadata> {
  const response = await fetch(`${API_BASE}/metadata`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`The Trivia API metadata error: HTTP ${response.status}`)
  }

  const json: unknown = await response.json()
  const parsed = triviaApiMetadataSchema.safeParse(json)

  if (!parsed.success) {
    throw new Error(`Invalid metadata response: ${parsed.error.message}`)
  }

  return parsed.data
}

export async function fetchTriviaMetadata(): Promise<ApiMetadata> {
  const metadata = await fetchTriviaRawMetadata()

  return {
    // Keys are already lowercase — what isDifficulty() expects.
    difficulties: Object.keys(metadata.byDifficulty),
    questionTypes: Object.keys(metadata.byType),
    categories: Object.keys(metadata.byCategory),
    tags: [],
    stats: {
      totalQuizzes: 0,
      totalQuestions: Object.values(metadata.byCategory).reduce(
        (sum, count) => sum + count,
        0,
      ),
    },
  }
}

// ---------------------------------------------------------------------------
// Categories (one topic listing the 10 trivia categories)
// ---------------------------------------------------------------------------

async function fetchTriviaCategoriesRecord(): Promise<TriviaApiCategories> {
  const response = await fetch(`${API_BASE}/categories`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`The Trivia API categories error: HTTP ${response.status}`)
  }

  const json: unknown = await response.json()
  const parsed = triviaApiCategoriesSchema.safeParse(json)

  if (!parsed.success) {
    throw new Error(`Invalid categories response: ${parsed.error.message}`)
  }

  return parsed.data
}

/**
 * Canonical slug of a /v2/categories entry: the alias that also exists
 * in metadata's byCategory, else one containing '_', else the first.
 */
function pickCanonicalSlug(
  slugs: string[],
  byCategory: Record<string, number> | undefined,
): string {
  const fromMetadata =
    byCategory && slugs.find((slug) => byCategory[slug] !== undefined)
  if (fromMetadata) return fromMetadata

  const underscored = slugs.find((slug) => slug.includes('_'))
  if (underscored) return underscored

  return slugs[0]
}

export async function fetchTriviaCategories(): Promise<{
  topics: Topic[]
  /** All categories flattened for lookup by slug. */
  flatCategories: Category[]
}> {
  // Metadata only supplies quizCount and helps detect canonical slugs:
  // categories are still usable when it fails.
  const [record, metadata] = await Promise.all([
    fetchTriviaCategoriesRecord(),
    fetchTriviaRawMetadata().catch(() => undefined),
  ])

  const byCategory = metadata?.byCategory
  const flatCategories: Category[] = []

  for (const [name, slugs] of Object.entries(record)) {
    const slug = pickCanonicalSlug(slugs, byCategory)
    flatCategories.push({
      id: slug,
      name,
      slug,
      icon: null,
      quizCount: byCategory?.[slug],
    })
  }

  return {
    topics: [
      {
        id: 'the-trivia-api',
        name: 'The Trivia API',
        slug: 'the-trivia-api',
        icon: null,
        categories: flatCategories,
      },
    ],
    flatCategories,
  }
}
