/**
 * The mock pool must mirror the live API's offset pagination: a total
 * for the header, disjoint slices per offset, and honest exhaustion.
 */

import { describe, expect, it } from 'vitest'
import {
  countMockQuestions,
  generateMockQuestions,
  mockQuestions,
} from './mock-questions'

describe('countMockQuestions', () => {
  it('reports the full filtered pool as its total', () => {
    expect(countMockQuestions('easy', 'all')).toBe(mockQuestions.length)
  })

  it('narrows the total with category and difficulty filters', () => {
    const total = countMockQuestions('hard', 'technology')
    const pool = generateMockQuestions(50, 'hard', 'technology')

    expect(total).toBeLessThan(mockQuestions.length)
    expect(pool).toHaveLength(total)
  })
})

describe('generateMockQuestions', () => {
  it('returns disjoint slices per offset', () => {
    const first = generateMockQuestions(5, 'easy', 'all', 0)
    const second = generateMockQuestions(5, 'easy', 'all', 5)

    const ids = new Set([...first, ...second].map((q) => q.id))
    expect(ids.size).toBe(10)
  })

  it('runs dry past the pool instead of repeating questions', () => {
    const total = countMockQuestions('easy', 'all')
    const past = generateMockQuestions(10, 'easy', 'all', total)

    expect(past).toHaveLength(0)
  })
})
