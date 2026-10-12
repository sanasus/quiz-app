/**
 * Tests for XP and level math.
 */

import { describe, expect, it } from 'vitest'
import { levelFromXp, sessionXp, xpForLevel, xpProgress } from './xp'
import type { SessionSummary } from '../../shared/types/meta'

function makeSummary(score: number): SessionSummary {
  return {
    finishedAt: 0,
    score,
    correctCount: 1,
    totalQuestions: 1,
    accuracy: 100,
    bestStreak: 1,
    timeSpent: 10,
    mode: 'classic',
    difficulty: 'easy',
    category: 'Code',
  }
}

describe('sessionXp', () => {
  it('is score / 10, rounded', () => {
    expect(sessionXp(makeSummary(250))).toBe(25)
    expect(sessionXp(makeSummary(254))).toBe(25)
    expect(sessionXp(makeSummary(255))).toBe(26)
  })

  it('is 0 for a zero score', () => {
    expect(sessionXp(makeSummary(0))).toBe(0)
  })
})

describe('xpForLevel / levelFromXp', () => {
  it('level 0 starts at 0 XP', () => {
    expect(xpForLevel(0)).toBe(0)
    expect(levelFromXp(0)).toBe(0)
  })

  it('level 1 requires 50 XP', () => {
    expect(xpForLevel(1)).toBe(50)
    expect(levelFromXp(49)).toBe(0)
    expect(levelFromXp(50)).toBe(1)
  })

  it('levels are quadratic: level L at 50·L²', () => {
    expect(xpForLevel(2)).toBe(200)
    expect(xpForLevel(3)).toBe(450)
    expect(levelFromXp(199)).toBe(1)
    expect(levelFromXp(200)).toBe(2)
    expect(levelFromXp(450)).toBe(3)
  })

  it('clamps negative XP to level 0', () => {
    expect(levelFromXp(-100)).toBe(0)
  })
})

describe('xpProgress', () => {
  it('reports progress within the current level', () => {
    expect(xpProgress(0)).toEqual({ level: 0, into: 0, need: 50 })
    expect(xpProgress(75)).toEqual({ level: 1, into: 25, need: 150 })
    expect(xpProgress(200)).toEqual({ level: 2, into: 0, need: 250 })
  })

  it('into is always below need', () => {
    for (const xp of [1, 49, 50, 51, 199, 201, 999]) {
      const p = xpProgress(xp)
      expect(p.into).toBeGreaterThanOrEqual(0)
      expect(p.into).toBeLessThan(p.need)
    }
  })
})
