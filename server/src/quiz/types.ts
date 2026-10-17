/**
 * Internal domain types of the quiz proxy server.
 *
 * These mirror the frontend's internal model (src/shared/types/quiz.ts)
 * but stay deliberately smaller: the wire contract to the client only
 * carries the fields the UI actually renders (see Catalog below).
 */

export type Difficulty = 'easy' | 'medium' | 'hard'

/** Quiz mode — carried through only so the query can be validated. */
export type QuizMode = 'classic' | 'timed' | 'blitz' | 'survival'

/** A question after adaptation — identical to the client's model. */
export interface Question {
  id: string
  text: string
  description?: string
  explanation?: string
  options: { id: string; text: string }[]
  correctOptionIds: string[]
  multiple: boolean
  category?: string
  difficulty: Difficulty
}

/**
 * A page of questions plus the pool size under the same filters.
 * `total` is optional — the trivia count endpoint can legitimately fail
 * without failing the whole page (it degrades to "unknown").
 */
export interface QuestionsPage {
  questions: Question[]
  total?: number
}

/**
 * What /api/quiz/questions receives. The client computes limit/offset
 * (survival batches), so the server stays stateless.
 */
export interface QuestionsQuery {
  /** Category slug, or 'all' for no filter. */
  category: string
  difficulty: Difficulty
  limit: number
  offset: number
}

/** One leaf category — only the fields the dropdown renders. */
export interface CatalogCategory {
  id: string
  name: string
  slug: string
  quizCount?: number
}

/** A topic grouping categories — accordion header in the dropdown. */
export interface CatalogTopic {
  id: string
  name: string
  slug: string
  categories: CatalogCategory[]
}

/**
 * Merged metadata + categories for the setup screen — one request.
 * Difficulties are already narrowed to the supported levels and
 * lowercased; topics are pre-filtered (quizCount > 0).
 */
export interface Catalog {
  difficulties: Difficulty[]
  topics: CatalogTopic[]
}
