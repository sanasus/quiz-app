/**
 * Tests for the SessionResult → SessionSummary adapter.
 */

import { describe, expect, it } from 'vitest'
import { toSessionSummary } from './to-session-summary'
import type { SessionResult } from '../../shared/types/quiz'

function makeResult(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    score: 250,
    correctCount: 8,
    incorrectCount: 2,
    totalQuestions: 10,
    timeSpent: 90,
    bestStreak: 5,
    finishedAt: Date.UTC(2026, 0, 1, 12),
    mode: 'classic',
    difficulty: 'medium',
    category: 'Code',
    attempts: [],
    livesLeft: 3,
    ...overrides,
  }
}

describe('toSessionSummary', () => {
  it('maps all fields and computes accuracy', () => {
    const summary = toSessionSummary(makeResult())

    expect(summary).toEqual({
      finishedAt: Date.UTC(2026, 0, 1, 12),
      score: 250,
      correctCount: 8,
      totalQuestions: 10,
      accuracy: 80,
      bestStreak: 5,
      timeSpent: 90,
      mode: 'classic',
      difficulty: 'medium',
      category: 'Code',
      categoryName: 'Code',
    })
  })

  it('derives a readable category name from the slug', () => {
    const summary = toSessionSummary(
      makeResult({ category: 'arts_and_literature' }),
    )
    expect(summary.categoryName).toBe('Arts and literature')
  })

  it('guards division by zero', () => {
    const summary = toSessionSummary(
      makeResult({
        totalQuestions: 0,
        correctCount: 0,
        incorrectCount: 0,
      }),
    )
    expect(summary.accuracy).toBe(0)
  })

  it('rounds accuracy', () => {
    const summary = toSessionSummary(
      makeResult({ correctCount: 2, totalQuestions: 3 }),
    )
    expect(summary.accuracy).toBe(67)
  })
})
