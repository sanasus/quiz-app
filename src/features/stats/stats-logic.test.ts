/**
 * Tests for the pure statistics logic.
 */

import { describe, expect, it } from 'vitest'
import {
  applySessionToStats,
  averageStreak,
  bucketAccuracy,
  consecutiveDays,
  createInitialStats,
  overallAccuracy,
  toIsoDate,
} from './stats-logic'
import type { SessionSummary } from '../../shared/types/meta'

function makeSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    finishedAt: Date.UTC(2026, 0, 1, 12),
    score: 100,
    correctCount: 8,
    totalQuestions: 10,
    accuracy: 80,
    bestStreak: 5,
    timeSpent: 60,
    mode: 'classic',
    difficulty: 'easy',
    category: 'Code',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// toIsoDate
// ---------------------------------------------------------------------------

describe('toIsoDate', () => {
  it('formats a timestamp as a local YYYY-MM-DD date', () => {
    const ts = new Date(2026, 4, 7, 13, 45).getTime() // May 7 2026, local
    expect(toIsoDate(ts)).toBe('2026-05-07')
  })

  it('pads single-digit months and days', () => {
    const ts = new Date(2026, 0, 3, 8).getTime()
    expect(toIsoDate(ts)).toBe('2026-01-03')
  })
})

// ---------------------------------------------------------------------------
// applySessionToStats
// ---------------------------------------------------------------------------

describe('applySessionToStats', () => {
  it('accumulates totals from an empty state', () => {
    const next = applySessionToStats(createInitialStats(), makeSummary())

    expect(next.totalSessions).toBe(1)
    expect(next.totalCorrect).toBe(8)
    expect(next.totalAnswered).toBe(10)
    expect(next.bestScore).toBe(100)
    expect(next.bestStreak).toBe(5)
    expect(next.streakSum).toBe(5)
  })

  it('keeps the max for bestScore and bestStreak', () => {
    let stats = applySessionToStats(createInitialStats(), makeSummary())
    stats = applySessionToStats(
      stats,
      makeSummary({ score: 40, bestStreak: 2 }),
    )

    expect(stats.bestScore).toBe(100)
    expect(stats.bestStreak).toBe(5)
    expect(stats.streakSum).toBe(7)
  })

  it('aggregates accuracy per category and difficulty', () => {
    let stats = applySessionToStats(
      createInitialStats(),
      makeSummary({ category: 'Code', difficulty: 'hard' }),
    )
    stats = applySessionToStats(
      stats,
      makeSummary({ category: 'Code', difficulty: 'easy' }),
    )

    expect(stats.byCategory.Code).toEqual({ correct: 16, total: 20 })
    expect(stats.byDifficulty.hard).toEqual({ correct: 8, total: 10 })
    expect(stats.byDifficulty.easy).toEqual({ correct: 8, total: 10 })
  })

  it('prepends to history and caps it', () => {
    let stats = createInitialStats()
    for (let i = 0; i < 35; i++) {
      stats = applySessionToStats(
        stats,
        makeSummary({ finishedAt: Date.UTC(2026, 0, 1 + i) }),
      )
    }

    expect(stats.history).toHaveLength(30)
    // Newest first.
    expect(stats.history[0].finishedAt).toBe(Date.UTC(2026, 0, 35))
  })

  it('deduplicates play days for the same calendar day', () => {
    let stats = applySessionToStats(createInitialStats(), makeSummary())
    stats = applySessionToStats(stats, makeSummary()) // same day

    expect(stats.playDays).toEqual(['2026-01-01'])
  })

  it('appends distinct play days in ascending order', () => {
    let stats = applySessionToStats(createInitialStats(), makeSummary())
    stats = applySessionToStats(
      stats,
      makeSummary({ finishedAt: Date.UTC(2025, 11, 30, 9) }),
    )

    expect(stats.playDays).toEqual(['2025-12-30', '2026-01-01'])
  })

  it('does not mutate the input state', () => {
    const before = createInitialStats()
    applySessionToStats(before, makeSummary())

    expect(before.totalSessions).toBe(0)
    expect(before.history).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe('overallAccuracy', () => {
  it('returns 0 when nothing was answered', () => {
    expect(overallAccuracy(createInitialStats())).toBe(0)
  })

  it('computes percent from totals', () => {
    let stats = applySessionToStats(createInitialStats(), makeSummary())
    stats = applySessionToStats(
      stats,
      makeSummary({ correctCount: 5, totalQuestions: 10 }),
    )

    expect(overallAccuracy(stats)).toBe(65) // 13/20
  })
})

describe('averageStreak', () => {
  it('returns 0 without sessions', () => {
    expect(averageStreak(createInitialStats())).toBe(0)
  })

  it('averages per-session best streaks', () => {
    let stats = applySessionToStats(
      createInitialStats(),
      makeSummary({ bestStreak: 4 }),
    )
    stats = applySessionToStats(stats, makeSummary({ bestStreak: 7 }))

    expect(averageStreak(stats)).toBe(5.5)
  })
})

describe('bucketAccuracy', () => {
  it('returns 0 for an empty bucket', () => {
    expect(bucketAccuracy({ correct: 0, total: 0 })).toBe(0)
  })

  it('computes rounded percent', () => {
    expect(bucketAccuracy({ correct: 2, total: 3 })).toBe(67)
  })
})

// ---------------------------------------------------------------------------
// consecutiveDays
// ---------------------------------------------------------------------------

describe('consecutiveDays', () => {
  it('returns 0 for no days', () => {
    expect(consecutiveDays([])).toBe(0)
  })

  it('counts a single day as 1', () => {
    expect(consecutiveDays(['2026-01-01'])).toBe(1)
  })

  it('counts a consecutive run ending at the latest day', () => {
    expect(consecutiveDays(['2026-01-01', '2026-01-02', '2026-01-03'])).toBe(3)
  })

  it('ignores gaps before the latest run', () => {
    expect(
      consecutiveDays(['2025-12-25', '2025-12-26', '2026-01-01', '2026-01-02']),
    ).toBe(2)
  })

  it('stops at a gap', () => {
    expect(consecutiveDays(['2026-01-01', '2026-01-03', '2026-01-04'])).toBe(2)
  })

  it('deduplicates days', () => {
    expect(consecutiveDays(['2026-01-02', '2026-01-02', '2026-01-03'])).toBe(2)
  })
})
