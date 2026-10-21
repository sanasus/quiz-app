import { describe, expect, it } from 'vitest'
import type { Question } from '../../shared/types/quiz'
import type { HistoryEntry } from './history-db'
import { selectQuestions } from './select-questions'

const q = (id: string): Question => ({
  id,
  text: id,
  options: [],
  correctOptionIds: [],
  difficulty: 'easy',
})

const pool = ['a', 'b', 'c', 'd', 'e'].map(q)
const ids = (list: Question[]) => list.map((x) => x.id)

describe('selectQuestions', () => {
  it('puts new questions first, then wrong, then correct', () => {
    const history = new Map<string, HistoryEntry>([
      ['a', { status: 'correct', lastSeen: 1 }],
      ['b', { status: 'wrong', lastSeen: 1 }],
    ])
    const { picked, newCount, repeats } = selectQuestions(pool, history, 5)

    expect(ids(picked)).toEqual(['c', 'd', 'e', 'b', 'a'])
    expect(newCount).toBe(3)
    expect(repeats).toBe(true)
  })

  it('orders repeats by how long ago they were seen', () => {
    const history = new Map<string, HistoryEntry>([
      ['a', { status: 'wrong', lastSeen: 30 }],
      ['b', { status: 'wrong', lastSeen: 10 }],
      ['c', { status: 'wrong', lastSeen: 20 }],
    ])
    const { picked } = selectQuestions(pool.slice(0, 3), history, 3)

    expect(ids(picked)).toEqual(['b', 'c', 'a'])
  })

  it('never shows reported questions', () => {
    const history = new Map<string, HistoryEntry>([
      ['a', { status: 'reported', lastSeen: 1 }],
    ])
    const { picked } = selectQuestions(pool, history, 5)

    expect(ids(picked)).toEqual(['b', 'c', 'd', 'e'])
  })

  it('skips excluded ids (already in the run)', () => {
    const { picked } = selectQuestions(pool, new Map(), 5, new Set(['a', 'b']))

    expect(ids(picked)).toEqual(['c', 'd', 'e'])
  })

  it('does not report repeats while there are enough new questions', () => {
    const { picked, repeats } = selectQuestions(pool, new Map(), 3)

    expect(ids(picked)).toEqual(['a', 'b', 'c'])
    expect(repeats).toBe(false)
  })

  it('still assembles a quiz when nothing is new', () => {
    const history = new Map<string, HistoryEntry>(
      pool.map((p) => [p.id, { status: 'correct', lastSeen: 1 }]),
    )
    const { picked, newCount } = selectQuestions(pool, history, 3)

    expect(picked).toHaveLength(3)
    expect(newCount).toBe(0)
  })
})
