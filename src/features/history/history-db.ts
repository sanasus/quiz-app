/**
 * Question history — what the player has already seen, in IndexedDB.
 *
 * One record per `providerId:questionId` (ids are unique only inside a
 * provider). IndexedDB rather than localStorage: records are written one
 * by one and asynchronously, there is no 5 MB ceiling, and indexes give
 * cheap eviction by `lastSeen` and lookups by provider + status.
 *
 * History is best effort: every function swallows storage failures
 * (private mode, blocked DB, no IndexedDB) and behaves as an empty
 * history, so a quiz can always be built.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type HistoryStatus = 'correct' | 'wrong' | 'reported'

export interface HistoryRecord {
  /** `providerId:questionId` — the primary key. */
  key: string
  providerId: string
  questionId: string
  status: HistoryStatus
  /** Epoch ms of the last time the question was shown/answered. */
  lastSeen: number
}

export type HistoryEntry = Pick<HistoryRecord, 'status' | 'lastSeen'>

interface HistorySchema extends DBSchema {
  answers: {
    key: string
    value: HistoryRecord
    indexes: {
      'by-last-seen': number
      'by-provider-status': [string, string]
    }
  }
}

export const HISTORY_DB_NAME = 'quiz-history'
/** Oldest non-reported records are evicted past this many. */
export const HISTORY_MAX_RECORDS = 20_000

const recordKey = (providerId: string, questionId: string) =>
  `${providerId}:${questionId}`

let dbPromise: Promise<IDBPDatabase<HistorySchema>> | null = null

function openHistoryDb(): Promise<IDBPDatabase<HistorySchema>> {
  dbPromise ??= openDB<HistorySchema>(HISTORY_DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore('answers', { keyPath: 'key' })
      store.createIndex('by-last-seen', 'lastSeen')
      store.createIndex('by-provider-status', ['providerId', 'status'])
    },
  }).catch((error) => {
    dbPromise = null
    throw error
  })
  return dbPromise
}

/** Test hook: drop the cached connection (a fresh fake IndexedDB per test). */
export async function closeHistoryDb(): Promise<void> {
  const pending = dbPromise
  dbPromise = null
  if (pending) (await pending.catch(() => null))?.close()
}

let persistenceRequested = false

/** Ask the browser not to evict the database under storage pressure (once). */
function requestPersistence() {
  if (persistenceRequested) return
  persistenceRequested = true
  void navigator.storage?.persist?.().catch(() => {})
}

/** Status of the given questions; unseen ones are simply absent. */
export async function getHistory(
  providerId: string,
  questionIds: readonly string[],
): Promise<Map<string, HistoryEntry>> {
  const result = new Map<string, HistoryEntry>()
  try {
    const db = await openHistoryDb()
    const records = await Promise.all(
      questionIds.map((id) => db.get('answers', recordKey(providerId, id))),
    )
    for (const record of records) {
      if (record) {
        result.set(record.questionId, {
          status: record.status,
          lastSeen: record.lastSeen,
        })
      }
    }
  } catch {
    // Best effort: an unreadable history is an empty one.
  }
  return result
}

async function putStatus(
  providerId: string,
  questionId: string,
  status: HistoryStatus,
  now: number,
): Promise<void> {
  const db = await openHistoryDb()
  const tx = db.transaction('answers', 'readwrite')
  const key = recordKey(providerId, questionId)
  const existing = await tx.store.get(key)
  await tx.store.put({
    key,
    providerId,
    questionId,
    // A report is final: later answers only refresh `lastSeen`.
    status: existing?.status === 'reported' ? 'reported' : status,
    lastSeen: now,
  })
  await tx.done
  await evictOverflow(db)
}

/** Remember how a question was answered. */
export async function recordAnswer(
  providerId: string,
  questionId: string,
  outcome: 'correct' | 'wrong',
  now = Date.now(),
): Promise<void> {
  try {
    requestPersistence()
    await putStatus(providerId, questionId, outcome, now)
  } catch {
    // Best effort.
  }
}

/** Mark a question as broken: it is never shown again. */
export async function reportQuestion(
  providerId: string,
  questionId: string,
  now = Date.now(),
): Promise<void> {
  try {
    requestPersistence()
    const db = await openHistoryDb()
    await db.put('answers', {
      key: recordKey(providerId, questionId),
      providerId,
      questionId,
      status: 'reported',
      lastSeen: now,
    })
  } catch {
    // Best effort.
  }
}

/** Drop the oldest records past the cap; reports are kept (they hide questions). */
async function evictOverflow(db: IDBPDatabase<HistorySchema>): Promise<void> {
  let excess = (await db.count('answers')) - HISTORY_MAX_RECORDS
  if (excess <= 0) return

  const tx = db.transaction('answers', 'readwrite')
  let cursor = await tx.store.index('by-last-seen').openCursor()
  while (cursor && excess > 0) {
    if (cursor.value.status !== 'reported') {
      await cursor.delete()
      excess--
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

/** Every record, for the backup file. */
export async function exportHistory(): Promise<HistoryRecord[]> {
  try {
    return await (await openHistoryDb()).getAll('answers')
  } catch {
    return []
  }
}

/** Replace the whole history (backup restore). */
export async function replaceHistory(
  records: readonly HistoryRecord[],
): Promise<void> {
  const db = await openHistoryDb()
  const tx = db.transaction('answers', 'readwrite')
  await tx.store.clear()
  for (const record of records) await tx.store.put(record)
  await tx.done
}

export async function clearHistory(): Promise<void> {
  try {
    await (await openHistoryDb()).clear('answers')
  } catch {
    // Best effort.
  }
}
