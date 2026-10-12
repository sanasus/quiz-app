/**
 * Tests for the achievement registry: each rule unlocks on its own
 * trigger, and checkAchievements never re-unlocks.
 */

import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  checkAchievements,
  EXPERT_CORRECT,
  STREAK_10,
  SURVIVOR_QUESTIONS,
} from './registry'
import type { UnlockedMap } from './registry'
import type { SessionSummary, StatsState } from '../../shared/types/meta'
import { applySessionToStats, createInitialStats } from '../stats/stats-logic'
import { toIsoDate } from '../stats/stats-logic'

function makeSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    finishedAt: Date.UTC(2026, 0, 1, 12),
    score: 100,
    correctCount: 10,
    totalQuestions: 10,
    accuracy: 100,
    bestStreak: 3,
    timeSpent: 60,
    mode: 'classic',
    difficulty: 'easy',
    category: 'Code',
    ...overrides,
  }
}

/** Stats AFTER the session was folded in (mirrors the hook's order). */
function statsWith(session: SessionSummary): StatsState {
  return applySessionToStats(createInitialStats(), session)
}

const noUnlocked: UnlockedMap = {}

function unlockedIds(result: ReturnType<typeof checkAchievements>): string[] {
  return result.map((a) => a.id)
}

// ---------------------------------------------------------------------------
// Per-achievement rules
// ---------------------------------------------------------------------------

describe('first_blood', () => {
  it('unlocks after one finished session', () => {
    const session = makeSummary()
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).toContain('first_blood')
  })
})

describe('streak_10', () => {
  it('unlocks when the session best streak reaches 10', () => {
    const session = makeSummary({ bestStreak: STREAK_10 })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).toContain('streak_10')
  })

  it('stays locked below the threshold', () => {
    const session = makeSummary({ bestStreak: STREAK_10 - 1 })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).not.toContain('streak_10')
  })
})

describe('perfectionist', () => {
  it('unlocks on 100% in a hard session', () => {
    const session = makeSummary({ difficulty: 'hard' })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).toContain('perfectionist')
  })

  it('stays locked on a perfect easy session', () => {
    const session = makeSummary({ difficulty: 'easy' })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).not.toContain('perfectionist')
  })

  it('stays locked on an imperfect hard session', () => {
    const session = makeSummary({
      difficulty: 'hard',
      correctCount: 9,
      accuracy: 90,
    })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).not.toContain('perfectionist')
  })
})

describe('speedster', () => {
  it('unlocks on a mistake-free blitz session', () => {
    const session = makeSummary({ mode: 'blitz' })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).toContain('speedster')
  })

  it('stays locked on a blitz session with mistakes', () => {
    const session = makeSummary({
      mode: 'blitz',
      correctCount: 8,
      accuracy: 80,
    })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).not.toContain('speedster')
  })

  it('stays locked on a perfect classic session', () => {
    const session = makeSummary({ mode: 'classic' })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).not.toContain('speedster')
  })
})

describe('survivor', () => {
  it('unlocks after surviving the target question count', () => {
    const session = makeSummary({
      mode: 'survival',
      totalQuestions: SURVIVOR_QUESTIONS,
      correctCount: 15,
      accuracy: 75,
    })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).toContain('survivor')
  })

  it('stays locked below the target', () => {
    const session = makeSummary({
      mode: 'survival',
      totalQuestions: SURVIVOR_QUESTIONS - 1,
      correctCount: 10,
    })
    const fresh = checkAchievements(statsWith(session), session, noUnlocked)
    expect(unlockedIds(fresh)).not.toContain('survivor')
  })
})

describe('expert', () => {
  it('unlocks once one category reaches the correct-answer count', () => {
    const big = makeSummary({
      correctCount: EXPERT_CORRECT,
      totalQuestions: EXPERT_CORRECT,
    })
    const fresh = checkAchievements(statsWith(big), big, noUnlocked)
    expect(unlockedIds(fresh)).toContain('expert')
  })

  it('accumulates across sessions of the same category', () => {
    let stats = createInitialStats()
    const half = EXPERT_CORRECT / 2
    const session1 = makeSummary({
      correctCount: half,
      totalQuestions: half,
    })
    stats = applySessionToStats(stats, session1)
    const session2 = makeSummary({
      correctCount: half,
      totalQuestions: half,
    })
    stats = applySessionToStats(stats, session2)

    const fresh = checkAchievements(stats, session2, noUnlocked)
    expect(unlockedIds(fresh)).toContain('expert')
  })

  it('does not mix categories', () => {
    // Two categories, each below the threshold — no unlock even though
    // the combined count would exceed it.
    const s1 = makeSummary({
      category: 'Code',
      correctCount: EXPERT_CORRECT - 10,
      totalQuestions: EXPERT_CORRECT - 10,
    })
    let stats = applySessionToStats(createInitialStats(), s1)
    const s2 = makeSummary({
      category: 'SQL',
      correctCount: 15,
      totalQuestions: 15,
    })
    stats = applySessionToStats(stats, s2)

    const fresh = checkAchievements(stats, s2, noUnlocked)
    expect(unlockedIds(fresh)).not.toContain('expert')
  })
})

describe('persistent', () => {
  it('unlocks after the consecutive-day run', () => {
    // Build playDays with 7 consecutive days ending at the session day.
    let stats = createInitialStats()
    const dayMs = 86_400_000
    for (let i = 6; i >= 0; i--) {
      stats = applySessionToStats(
        stats,
        makeSummary({ finishedAt: Date.UTC(2026, 0, 8) - i * dayMs }),
      )
    }

    const fresh = checkAchievements(
      stats,
      makeSummary({ finishedAt: Date.UTC(2026, 0, 8) }),
      noUnlocked,
    )
    expect(unlockedIds(fresh)).toContain('persistent')
  })

  it('stays locked on a broken streak', () => {
    let stats = createInitialStats()
    const dayMs = 86_400_000
    for (const i of [7, 6, 5, 3, 2, 1, 0]) {
      stats = applySessionToStats(
        stats,
        makeSummary({ finishedAt: Date.UTC(2026, 0, 8) - i * dayMs }),
      )
    }

    const fresh = checkAchievements(
      stats,
      makeSummary({ finishedAt: Date.UTC(2026, 0, 8) }),
      noUnlocked,
    )
    expect(unlockedIds(fresh)).not.toContain('persistent')
  })
})

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe('checkAchievements idempotency', () => {
  it('never re-reports already-unlocked achievements', () => {
    const session = makeSummary({ bestStreak: STREAK_10 })
    const stats = statsWith(session)
    const first = checkAchievements(stats, session, noUnlocked)
    expect(first.length).toBeGreaterThan(0)

    // Simulate the store after unlocking.
    const unlocked: UnlockedMap = {}
    for (const a of first) unlocked[a.id] = toIsoDate(session.finishedAt)

    expect(checkAchievements(stats, session, unlocked)).toHaveLength(0)
  })

  it('all registry ids are unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
