import { describe, expect, it, vi } from 'vitest'
import type { Question } from '../../shared/types/quiz'
import type { QuestionsPage } from '../../shared/api/providers'
import type { HistoryEntry } from './history-db'
import {
  loadCursorBatch,
  loadCursorQuiz,
  loadRandomBatch,
  loadRandomQuiz,
  type FetchPage,
} from './load-quiz'

const q = (id: string): Question => ({
  id,
  text: id,
  options: [],
  correctOptionIds: [],
  difficulty: 'easy',
})
const ids = (list: Question[]) => list.map((x) => x.id)

/** An ordered pool that honours limit/offset like QuizAPI. */
function cursorSource(poolIds: string[]) {
  return vi.fn<FetchPage>(async ({ limit, offset }) => ({
    questions: poolIds.slice(offset, offset + limit).map(q),
    total: poolIds.length,
  }))
}

const historyOf =
  (entries: Record<string, HistoryEntry>) => async (idList: string[]) =>
    new Map(idList.filter((id) => entries[id]).map((id) => [id, entries[id]]))

const seen = (status: HistoryEntry['status'], lastSeen = 1): HistoryEntry => ({
  status,
  lastSeen,
})

describe('loadCursorQuiz', () => {
  const pool = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']

  it('starts at the cursor and reports where to continue', async () => {
    const fetchPage = cursorSource(pool)
    const loaded = await loadCursorQuiz({
      fetchPage,
      readHistory: historyOf({}),
      shuffle: false,
      startOffset: 2,
      count: 3,
    })

    expect(ids(loaded.questions)).toEqual(['p3', 'p4', 'p5'])
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith({ limit: 3, offset: 2 })
    expect(loaded).toMatchObject({
      total: 6,
      repeats: false,
      poolStart: 2,
      poolConsumed: 3,
      nextCursor: 5,
    })
  })

  it('wraps to the start of the pool without calling new questions repeats', async () => {
    const loaded = await loadCursorQuiz({
      fetchPage: cursorSource(pool),
      readHistory: historyOf({}),
      shuffle: false,
      startOffset: 4,
      count: 3,
    })

    // p5, p6 from the tail, then a top-up page from the beginning.
    expect(ids(loaded.questions)).toEqual(['p5', 'p6', 'p1'])
    expect(loaded.repeats).toBe(false)
    expect(loaded.nextCursor).toBe(1)
  })

  it('tops up past seen questions, within the request cap', async () => {
    const fetchPage = cursorSource(pool)
    const loaded = await loadCursorQuiz({
      fetchPage,
      readHistory: historyOf({
        p1: seen('correct'),
        p2: seen('correct'),
        p3: seen('correct'),
      }),
      shuffle: false,
      startOffset: 0,
      count: 3,
    })

    expect(ids(loaded.questions)).toEqual(['p4', 'p5', 'p6'])
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(loaded.repeats).toBe(false)
  })

  it('continues right after the last used question, not after everything fetched', async () => {
    const loaded = await loadCursorQuiz({
      fetchPage: cursorSource(pool),
      readHistory: historyOf({ p1: seen('correct') }),
      shuffle: false,
      startOffset: 0,
      count: 2,
    })

    // p1 is seen: the quiz is p2, p3 — p4 (fetched by the top-up) stays
    // for the next quiz instead of being skipped.
    expect(ids(loaded.questions)).toEqual(['p2', 'p3'])
    expect(loaded.nextCursor).toBe(3)
    expect(loaded.poolConsumed).toBe(3)
  })

  it('falls back to repeats (wrong first) when nothing in the pool is new', async () => {
    const loaded = await loadCursorQuiz({
      fetchPage: cursorSource(['p1', 'p2', 'p3']),
      readHistory: historyOf({
        p1: seen('correct', 5),
        p2: seen('wrong', 9),
        p3: seen('correct', 1),
      }),
      shuffle: false,
      startOffset: 0,
      count: 3,
    })

    expect(ids(loaded.questions)).toEqual(['p2', 'p3', 'p1'])
    expect(loaded.repeats).toBe(true)
  })

  it('never includes reported questions, even to fill the quiz', async () => {
    const loaded = await loadCursorQuiz({
      fetchPage: cursorSource(['p1', 'p2', 'p3']),
      readHistory: historyOf({ p2: seen('reported') }),
      shuffle: false,
      startOffset: 0,
      count: 3,
    })

    expect(ids(loaded.questions)).toEqual(['p1', 'p3'])
  })

  it('goes back to the beginning when the cursor is past the pool end', async () => {
    const loaded = await loadCursorQuiz({
      fetchPage: cursorSource(pool),
      readHistory: historyOf({}),
      shuffle: false,
      startOffset: 40,
      count: 2,
    })

    expect(ids(loaded.questions)).toEqual(['p1', 'p2'])
  })

  it('shuffles the play order only when asked', async () => {
    const loaded = await loadCursorQuiz({
      fetchPage: cursorSource(pool),
      readHistory: historyOf({}),
      shuffle: true,
      random: () => 0,
      startOffset: 0,
      count: 3,
    })

    expect(ids(loaded.questions)).not.toEqual(['p1', 'p2', 'p3'])
    expect(ids(loaded.questions).sort()).toEqual(['p1', 'p2', 'p3'])
  })
})

describe('loadRandomQuiz', () => {
  /** Every call is a random draw; the last draw repeats if calls run out. */
  function randomSource(draws: string[][]) {
    let call = 0
    return vi.fn<FetchPage>(async (): Promise<QuestionsPage> => {
      const draw = draws[Math.min(call++, draws.length - 1)]
      return { questions: draw.map(q) }
    })
  }

  it('asks for a generous page and filters it against the history', async () => {
    const fetchPage = randomSource([['t1', 't2', 't3', 't4', 't5', 't6']])
    const loaded = await loadRandomQuiz({
      fetchPage,
      readHistory: historyOf({ t1: seen('correct'), t2: seen('correct') }),
      shuffle: false,
      count: 3,
    })

    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith({ limit: 20, offset: 0 })
    expect(ids(loaded.questions)).toEqual(['t3', 't4', 't5'])
    expect(loaded.repeats).toBe(false)
  })

  it('makes at most one extra request when new questions run short', async () => {
    const fetchPage = randomSource([
      ['t1', 't2'],
      ['t2', 't3', 't4'],
    ])
    const loaded = await loadRandomQuiz({
      fetchPage,
      readHistory: historyOf({ t1: seen('correct') }),
      shuffle: false,
      count: 3,
    })

    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(ids(loaded.questions)).toEqual(['t2', 't3', 't4'])
  })

  it('repeats by priority when even the top-up has nothing new', async () => {
    const fetchPage = randomSource([['t1', 't2']])
    const loaded = await loadRandomQuiz({
      fetchPage,
      readHistory: historyOf({
        t1: seen('correct', 1),
        t2: seen('wrong', 2),
      }),
      shuffle: false,
      count: 2,
    })

    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(ids(loaded.questions)).toEqual(['t2', 't1'])
    expect(loaded.repeats).toBe(true)
  })
})

describe('loadCursorBatch', () => {
  const pool = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
  const base = {
    readHistory: historyOf({}),
    shuffle: false,
    limit: 2,
    exclude: new Set<string>(),
  }

  it('continues at start + consumed', async () => {
    const fetchPage = cursorSource(pool)
    const batch = await loadCursorBatch({
      ...base,
      fetchPage,
      poolStart: 1,
      poolConsumed: 2,
      total: 6,
    })

    expect(fetchPage).toHaveBeenCalledWith({ limit: 2, offset: 3 })
    expect(ids(batch.questions)).toEqual(['p4', 'p5'])
    expect(batch).toMatchObject({ rawCount: 2, exhausted: false })
  })

  it('is exhausted once the whole pool has been consumed', async () => {
    const batch = await loadCursorBatch({
      ...base,
      fetchPage: cursorSource(pool),
      poolStart: 0,
      poolConsumed: 4,
      total: 6,
    })

    expect(ids(batch.questions)).toEqual(['p5', 'p6'])
    expect(batch.exhausted).toBe(true)
  })

  it('does not call a batch that was filtered to nothing exhausted', async () => {
    const batch = await loadCursorBatch({
      ...base,
      fetchPage: cursorSource(pool),
      readHistory: historyOf({ p3: seen('reported'), p4: seen('reported') }),
      poolStart: 0,
      poolConsumed: 2,
      total: 6,
    })

    expect(batch.questions).toEqual([])
    expect(batch.rawCount).toBe(2)
    expect(batch.exhausted).toBe(false)
  })

  it('drops questions already in the run', async () => {
    const batch = await loadCursorBatch({
      ...base,
      fetchPage: cursorSource(pool),
      exclude: new Set(['p3']),
      poolStart: 0,
      poolConsumed: 2,
      total: 6,
    })

    expect(ids(batch.questions)).toEqual(['p4'])
  })

  it('needs no request when everything was already handed out', async () => {
    const fetchPage = cursorSource(pool)
    const batch = await loadCursorBatch({
      ...base,
      fetchPage,
      poolStart: 0,
      poolConsumed: 6,
      total: 6,
    })

    expect(fetchPage).not.toHaveBeenCalled()
    expect(batch.exhausted).toBe(true)
  })
})

describe('loadRandomBatch', () => {
  it('is exhausted only when nothing usable came back', async () => {
    const fetchPage = vi.fn<FetchPage>(async () => ({
      questions: ['t1', 't2'].map(q),
    }))
    const batch = await loadRandomBatch({
      fetchPage,
      readHistory: historyOf({}),
      shuffle: false,
      limit: 2,
      exclude: new Set(['t1', 't2']),
    })

    expect(batch.questions).toEqual([])
    expect(batch.exhausted).toBe(true)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('returns the unseen part of a draw', async () => {
    const batch = await loadRandomBatch({
      fetchPage: vi.fn<FetchPage>(async () => ({
        questions: ['t1', 't2', 't3'].map(q),
      })),
      readHistory: historyOf({}),
      shuffle: false,
      limit: 2,
      exclude: new Set(['t1']),
    })

    expect(ids(batch.questions)).toEqual(['t2', 't3'])
    expect(batch.exhausted).toBe(false)
  })
})
