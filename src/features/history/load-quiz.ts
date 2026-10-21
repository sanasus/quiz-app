/**
 * Assembling a quiz from a provider's pages and the player's history.
 *
 * Two paging strategies, because the sources differ:
 *
 * - **cursor** (QuizAPI, mock): the pool has a stable order and honours
 *   `offset`. The next quiz continues from a remembered cursor, so new
 *   questions come first by construction; running past `total` wraps to
 *   the start, where repeats take over.
 * - **random** (Trivia): `offset` is ignored and every page is a random
 *   draw. Ask for a generous page, filter against the history, top up at
 *   most once.
 *
 * Both stay within a handful of requests per quiz (the proxy allows 30
 * per minute) and make up any shortfall with repeats, by priority.
 * Pure: pages and history come in through injected functions.
 */

import type { Question } from '../../shared/types/quiz'
import type { QuestionsPage } from '../../shared/api/providers'
import type { HistoryEntry } from './history-db'
import { selectQuestions } from './select-questions'

export type FetchPage = (options: {
  limit: number
  offset: number
}) => Promise<QuestionsPage>

export type ReadHistory = (
  questionIds: string[],
) => Promise<Map<string, HistoryEntry>>

/** At most this many page requests assemble one quiz. */
const MAX_REQUESTS = 3
/** Trivia caps a page at 50. */
const RANDOM_PAGE_MAX = 50
const RANDOM_REQUESTS = 2

export interface LoadedQuiz {
  questions: Question[]
  total?: number
  /** No new questions were left, so repeats were used. */
  repeats: boolean
  /** Pool position the run started from (cursor providers; 0 otherwise). */
  poolStart: number
  /** Raw pool items consumed from `poolStart` by the initial pages. */
  poolConsumed: number
  /** Where the next quiz should continue. */
  nextCursor: number
}

export interface LoadedBatch {
  questions: Question[]
  total?: number
  /** Raw pool items this batch consumed (cursor providers). */
  rawCount: number
  /** The pool has nothing further to give. */
  exhausted: boolean
}

interface Common {
  fetchPage: FetchPage
  readHistory: ReadHistory
  /** Shuffle the play order (never for the deterministic mock). */
  shuffle: boolean
  random?: () => number
}

/** Fisher–Yates; returns a copy. */
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const wrap = (offset: number, total: number | undefined) =>
  total ? offset % total : offset

function merge(pool: Question[], seen: Set<string>, incoming: Question[]) {
  for (const question of incoming) {
    if (seen.has(question.id)) continue
    seen.add(question.id)
    pool.push(question)
  }
}

// ---------------------------------------------------------------------------
// Initial quiz
// ---------------------------------------------------------------------------

export async function loadCursorQuiz({
  fetchPage,
  readHistory,
  shuffle,
  random,
  startOffset,
  count,
}: Common & { startOffset: number; count: number }): Promise<LoadedQuiz> {
  const pool: Question[] = []
  const seen = new Set<string>()
  // Absolute (unwrapped) pool position of each collected question.
  const positions = new Map<string, number>()
  let total: number | undefined
  let startAbs = startOffset
  let offset = startOffset
  let consumed = 0
  let requests = 0
  let selection = selectQuestions([], new Map(), count)

  while (requests < MAX_REQUESTS) {
    const page = await fetchPage({ limit: count, offset: wrap(offset, total) })
    requests++
    total = page.total ?? total

    if (page.questions.length === 0) {
      // Ran past the end of the pool: continue from the beginning.
      if (wrap(offset, total) === 0) break
      offset = 0
      startAbs = 0
      consumed = 0
      continue
    }

    page.questions.forEach((question, i) => {
      if (!positions.has(question.id)) {
        positions.set(question.id, offset + i)
      }
    })
    merge(pool, seen, page.questions)
    offset += page.questions.length
    consumed += page.questions.length

    const history = await readHistory(pool.map((q) => q.id))
    selection = selectQuestions(pool, history, count)

    if (selection.newCount >= count) break
    // The whole pool has been looked at: repeats are all there is.
    if (total !== undefined && consumed >= total) break
  }

  // Continue right after the last question actually used, not after
  // everything that was fetched: unused fresh ones stay for next time.
  // With no new question picked there is nothing to hold on to.
  const history = await readHistory(selection.picked.map((q) => q.id))
  const usedNew = selection.picked.filter((q) => !history.has(q.id))
  const nextAbs =
    usedNew.length > 0
      ? Math.max(...usedNew.map((q) => positions.get(q.id) ?? offset - 1)) + 1
      : offset

  return {
    questions: shuffle ? shuffled(selection.picked, random) : selection.picked,
    total,
    repeats: selection.repeats,
    poolStart: wrap(startAbs, total),
    poolConsumed: nextAbs - startAbs,
    nextCursor: wrap(nextAbs, total),
  }
}

export async function loadRandomQuiz({
  fetchPage,
  readHistory,
  shuffle,
  random,
  count,
}: Common & { count: number }): Promise<LoadedQuiz> {
  const limit = Math.min(RANDOM_PAGE_MAX, Math.max(count * 3, 20))
  const pool: Question[] = []
  const seen = new Set<string>()
  let total: number | undefined
  let selection = selectQuestions([], new Map(), count)

  for (let request = 0; request < RANDOM_REQUESTS; request++) {
    const page = await fetchPage({ limit, offset: 0 })
    total ??= page.total
    merge(pool, seen, page.questions)

    selection = selectQuestions(
      pool,
      await readHistory(pool.map((q) => q.id)),
      count,
    )
    if (selection.newCount >= count) break
  }

  return {
    questions: shuffle ? shuffled(selection.picked, random) : selection.picked,
    total,
    repeats: selection.repeats,
    poolStart: 0,
    poolConsumed: 0,
    nextCursor: 0,
  }
}

// ---------------------------------------------------------------------------
// Survival batches
// ---------------------------------------------------------------------------

/**
 * The next survival batch from a cursor pool. Questions already in the
 * run and reported ones are dropped; an all-filtered batch is NOT
 * exhaustion — only reaching the end of the pool is.
 */
export async function loadCursorBatch({
  fetchPage,
  readHistory,
  shuffle,
  random,
  poolStart,
  poolConsumed,
  total,
  limit,
  exclude,
}: Common & {
  poolStart: number
  poolConsumed: number
  total?: number
  limit: number
  exclude: ReadonlySet<string>
}): Promise<LoadedBatch> {
  // Every pool item was already handed out: no request needed.
  if (total !== undefined && poolConsumed >= total) {
    return { questions: [], total, rawCount: 0, exhausted: true }
  }

  const page = await fetchPage({
    limit,
    offset: wrap(poolStart + poolConsumed, total),
  })
  const pageTotal = page.total ?? total
  const history = await readHistory(page.questions.map((q) => q.id))
  const { picked } = selectQuestions(
    page.questions,
    history,
    page.questions.length,
    exclude,
  )
  // Pool order is what makes the cursor stable; only reorder what remains.
  const fresh = picked.filter((q) => !history.has(q.id))
  const rest = picked.filter((q) => history.has(q.id))

  return {
    questions: shuffle
      ? shuffled([...fresh, ...rest], random)
      : [...fresh, ...rest],
    total: pageTotal,
    rawCount: page.questions.length,
    exhausted:
      page.questions.length === 0 ||
      (pageTotal !== undefined &&
        poolConsumed + page.questions.length >= pageTotal),
  }
}

export async function loadRandomBatch({
  fetchPage,
  readHistory,
  shuffle,
  random,
  limit,
  exclude,
}: Common & {
  limit: number
  exclude: ReadonlySet<string>
}): Promise<LoadedBatch> {
  const pool: Question[] = []
  const seen = new Set<string>()
  let total: number | undefined
  let selection = selectQuestions([], new Map(), limit)

  for (let request = 0; request < RANDOM_REQUESTS; request++) {
    const page = await fetchPage({
      limit: Math.min(RANDOM_PAGE_MAX, limit * 3),
      offset: 0,
    })
    total ??= page.total
    merge(pool, seen, page.questions)

    selection = selectQuestions(
      pool,
      await readHistory(pool.map((q) => q.id)),
      limit,
      exclude,
    )
    if (selection.newCount >= limit) break
  }

  return {
    questions: shuffle ? shuffled(selection.picked, random) : selection.picked,
    total,
    rawCount: 0,
    // A random pool never ends by position; two draws with nothing usable
    // is as close to "out of questions" as it gets.
    exhausted: selection.picked.length === 0,
  }
}
