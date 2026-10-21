/**
 * Priorities, not bans: which of the candidate questions go into a quiz.
 *
 * new → answered wrong → answered right, the latter two by `lastSeen`
 * (longest ago first). Reported questions never appear. A quiz is always
 * assembled — repeats fill in when the new questions run out.
 */

import type { Question } from '../../shared/types/quiz'
import type { HistoryEntry } from './history-db'

export interface Selection {
  picked: Question[]
  /** How many of the picked questions have never been seen. */
  newCount: number
  /** At least one picked question is a repeat. */
  repeats: boolean
}

export function selectQuestions(
  candidates: readonly Question[],
  history: ReadonlyMap<string, HistoryEntry>,
  count: number,
  exclude: ReadonlySet<string> = new Set(),
): Selection {
  const fresh: Question[] = []
  const wrong: Question[] = []
  const correct: Question[] = []

  for (const question of candidates) {
    if (exclude.has(question.id)) continue
    const entry = history.get(question.id)
    if (!entry) fresh.push(question)
    else if (entry.status === 'wrong') wrong.push(question)
    else if (entry.status === 'correct') correct.push(question)
    // 'reported' is dropped.
  }

  const byAge = (a: Question, b: Question) =>
    (history.get(a.id)?.lastSeen ?? 0) - (history.get(b.id)?.lastSeen ?? 0)
  wrong.sort(byAge)
  correct.sort(byAge)

  const picked = [...fresh, ...wrong, ...correct].slice(0, count)
  const newCount = Math.min(fresh.length, picked.length)
  return { picked, newCount, repeats: picked.length > newCount }
}
