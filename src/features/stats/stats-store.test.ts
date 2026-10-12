/**
 * Tests for the stats store actions (persist wiring is covered by
 * stats-schema.test.ts; here we check the store-level behavior).
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { useStatsStore } from './stats-store'
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

beforeEach(() => {
  useStatsStore.getState().resetStats()
})

describe('recordSession', () => {
  it('accumulates a session', () => {
    useStatsStore.getState().recordSession(makeSummary())

    const s = useStatsStore.getState()
    expect(s.totalSessions).toBe(1)
    expect(s.totalCorrect).toBe(8)
    expect(s.history[0].finishedAt).toBe(Date.UTC(2026, 0, 1, 12))
    expect(s.playDays).toHaveLength(1)
  })

  it('two sessions on the same day produce one play day', () => {
    useStatsStore.getState().recordSession(makeSummary())
    useStatsStore
      .getState()
      .recordSession(makeSummary({ finishedAt: Date.UTC(2026, 0, 1, 18) }))

    expect(useStatsStore.getState().playDays).toHaveLength(1)
    expect(useStatsStore.getState().totalSessions).toBe(2)
  })
})

describe('resetStats', () => {
  it('restores the initial state', () => {
    useStatsStore.getState().recordSession(makeSummary())
    useStatsStore.getState().resetStats()

    const s = useStatsStore.getState()
    expect(s.totalSessions).toBe(0)
    expect(s.history).toHaveLength(0)
    expect(s.playDays).toHaveLength(0)
  })
})
