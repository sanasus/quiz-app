/**
 * Tests for the stats persistence schema: validation fallback and
 * versioned migrations.
 */

import { describe, expect, it } from 'vitest'
import {
  STATS_STORE_VERSION,
  parsePersistedStats,
  statsDataSchema,
} from './stats-schema'
import { createInitialStats } from './stats-logic'

const validData = {
  totalSessions: 2,
  totalCorrect: 15,
  totalAnswered: 20,
  bestScore: 300,
  bestStreak: 9,
  streakSum: 12,
  byCategory: { Code: { correct: 15, total: 20 } },
  byDifficulty: { hard: { correct: 15, total: 20 } },
  history: [
    {
      finishedAt: 1_767_225_000_000,
      score: 200,
      correctCount: 8,
      totalQuestions: 10,
      accuracy: 80,
      bestStreak: 5,
      timeSpent: 60,
      mode: 'classic',
      difficulty: 'easy',
      category: 'Code',
    },
  ],
  playDays: ['2026-01-01'],
}

describe('statsDataSchema', () => {
  it('accepts valid data', () => {
    expect(statsDataSchema.safeParse(validData).success).toBe(true)
  })

  it('rejects a wrong enum value', () => {
    const broken = {
      ...validData,
      history: [{ ...validData.history[0], mode: 'expert' }],
    }
    expect(statsDataSchema.safeParse(broken).success).toBe(false)
  })

  it('rejects negative counters', () => {
    const broken = { ...validData, totalSessions: -1 }
    expect(statsDataSchema.safeParse(broken).success).toBe(false)
  })

  it('rejects a history entry with accuracy out of range', () => {
    const broken = {
      ...validData,
      history: [{ ...validData.history[0], accuracy: 140 }],
    }
    expect(statsDataSchema.safeParse(broken).success).toBe(false)
  })
})

describe('parsePersistedStats', () => {
  it('passes through valid current-version data', () => {
    expect(parsePersistedStats(validData, STATS_STORE_VERSION)).toEqual(
      validData,
    )
  })

  it('migrates v0 data by filling in new fields', () => {
    const { bestStreak: _b, streakSum: _s, playDays: _p, ...v0 } = validData
    const migrated = parsePersistedStats(v0, 0)

    expect(migrated.totalSessions).toBe(2)
    expect(migrated.bestStreak).toBe(0)
    expect(migrated.streakSum).toBe(0)
    expect(migrated.playDays).toEqual([])
  })

  it('migrates v1 data by deriving category labels from slugs', () => {
    const v1 = {
      ...validData,
      byCategory: {
        arts_and_literature: { correct: 3, total: 4 },
        all: { correct: 1, total: 2 },
      },
      history: [{ ...validData.history[0], category: 'arts_and_literature' }],
    }
    const migrated = parsePersistedStats(v1, 1)

    expect(migrated.byCategory.arts_and_literature).toEqual({
      correct: 3,
      total: 4,
      label: 'Arts and literature',
    })
    expect(migrated.byCategory.all?.label).toBe('All')
    expect(migrated.history[0]?.categoryName).toBe('Arts and literature')
  })

  it('keeps labels that are already stored when migrating v1', () => {
    const v1 = {
      ...validData,
      byCategory: { science: { correct: 1, total: 1, label: 'Science!' } },
    }
    expect(parsePersistedStats(v1, 1).byCategory.science?.label).toBe(
      'Science!',
    )
  })

  it('falls back to initial stats for corrupt data', () => {
    expect(parsePersistedStats({ garbage: true }, STATS_STORE_VERSION)).toEqual(
      createInitialStats(),
    )
  })

  it('falls back to initial stats for null', () => {
    expect(parsePersistedStats(null, STATS_STORE_VERSION)).toEqual(
      createInitialStats(),
    )
  })

  it('falls back to initial stats for an unknown old version', () => {
    expect(parsePersistedStats(validData, -1)).toEqual(createInitialStats())
  })
})
