import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearHistory,
  closeHistoryDb,
  exportHistory,
  getHistory,
  recordAnswer,
  replaceHistory,
  reportQuestion,
} from './history-db'

beforeEach(async () => {
  await closeHistoryDb()
  globalThis.indexedDB = new IDBFactory()
})

afterEach(async () => {
  await closeHistoryDb()
})

describe('history db', () => {
  it('reads back what was recorded, keyed per provider', async () => {
    await recordAnswer('quizapi', 'q1', 'correct', 100)
    await recordAnswer('trivia', 'q1', 'wrong', 200)

    const quizapi = await getHistory('quizapi', ['q1', 'q2'])
    expect(quizapi.get('q1')).toEqual({ status: 'correct', lastSeen: 100 })
    expect(quizapi.has('q2')).toBe(false)
    expect((await getHistory('trivia', ['q1'])).get('q1')?.status).toBe('wrong')
  })

  it('updates the status and lastSeen on a repeat answer', async () => {
    await recordAnswer('quizapi', 'q1', 'wrong', 100)
    await recordAnswer('quizapi', 'q1', 'correct', 300)

    expect((await getHistory('quizapi', ['q1'])).get('q1')).toEqual({
      status: 'correct',
      lastSeen: 300,
    })
  })

  it('keeps a report final: later answers only refresh lastSeen', async () => {
    await reportQuestion('quizapi', 'q1', 100)
    await recordAnswer('quizapi', 'q1', 'correct', 500)

    expect((await getHistory('quizapi', ['q1'])).get('q1')).toEqual({
      status: 'reported',
      lastSeen: 500,
    })
  })

  it('exports and replaces the whole history', async () => {
    await recordAnswer('quizapi', 'old', 'wrong', 1)
    const backup = [
      {
        key: 'trivia:n1',
        providerId: 'trivia',
        questionId: 'n1',
        status: 'correct' as const,
        lastSeen: 7,
      },
    ]

    await replaceHistory(backup)

    expect(await exportHistory()).toEqual(backup)
    expect((await getHistory('quizapi', ['old'])).size).toBe(0)
  })

  it('clears everything', async () => {
    await recordAnswer('quizapi', 'q1', 'wrong', 1)
    await clearHistory()

    expect(await exportHistory()).toEqual([])
  })

  it('behaves as an empty history when IndexedDB is unavailable', async () => {
    // @ts-expect-error simulate a browser without IndexedDB
    delete globalThis.indexedDB

    await expect(
      recordAnswer('quizapi', 'q1', 'wrong'),
    ).resolves.toBeUndefined()
    expect((await getHistory('quizapi', ['q1'])).size).toBe(0)
    expect(await exportHistory()).toEqual([])
  })
})
