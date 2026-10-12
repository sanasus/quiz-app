/**
 * Tests for the scoring function (scoring.ts).
 *
 * Covers:
 * - base scores per difficulty
 * - inverse speed bonus (faster answer = more points)
 * - streak multiplier
 * - edge cases (instant/slow answers, high streak, ceiling)
 */

import { describe, it, expect } from 'vitest'
import { calculateScore, maxScoreForDifficulty } from './scoring'

describe('calculateScore', () => {
  it('returns base score for easy when the answer took 50+ seconds', () => {
    expect(calculateScore('easy', 50, 0)).toBe(20)
  })

  it('returns base score for medium', () => {
    expect(calculateScore('medium', 50, 0)).toBe(40)
  })

  it('returns base score for hard', () => {
    expect(calculateScore('hard', 50, 0)).toBe(60)
  })

  it('adds an inverse speed bonus (faster answer = more points)', () => {
    // instant answer (under 5s) → full +10
    expect(calculateScore('easy', 0, 0)).toBe(20 + 10)
    expect(calculateScore('easy', 4, 0)).toBe(20 + 10)
    // 25 seconds → 10 - 5 = 5
    expect(calculateScore('easy', 25, 0)).toBe(20 + 5)
    // 50 seconds → no bonus (floor hit 0)
    expect(calculateScore('easy', 50, 0)).toBe(20)
    // 100 seconds → still 0 (clamped)
    expect(calculateScore('easy', 100, 0)).toBe(20)
  })

  it('applies streak multiplier (1 + min(streak/5, 4) * 0.2)', () => {
    // streak 0 → mult 1.0 (50s keeps speed bonus at 0 for clarity)
    expect(calculateScore('easy', 50, 0)).toBe(20)
    // streak 5 → mult 1.2
    expect(calculateScore('easy', 50, 5)).toBe(Math.round(20 * 1.2)) // 24
    // streak 10 → mult 1.4
    expect(calculateScore('easy', 50, 10)).toBe(Math.round(20 * 1.4)) // 28
    // streak 20 → mult 1.8 (capped at 4 * 0.2 = 0.8)
    expect(calculateScore('easy', 50, 20)).toBe(Math.round(20 * 1.8)) // 36
  })

  it('caps multiplier at 5x (streak >= 20)', () => {
    // streak 20 → mult = 1 + 4 * 0.2 = 1.8
    // streak 25 → mult = 1 + 4 * 0.2 = 1.8 (still capped)
    expect(calculateScore('hard', 50, 20)).toBe(calculateScore('hard', 50, 25))
  })

  it('combines base + speed + streak', () => {
    // hard (60) + speed 4 (30s elapsed) + streak mult 1.4 (10 streak)
    const score = calculateScore('hard', 30, 10)
    expect(score).toBe(Math.round(60 * 1.4) + 4) // 84 + 4 = 88
  })

  it('handles zero streak correctly', () => {
    // streak 0 → mult = 1.0
    expect(calculateScore('medium', 50, 0)).toBe(40)
  })
})

describe('maxScoreForDifficulty', () => {
  it('returns max possible score for each difficulty', () => {
    // easy: 20 * 5 + 10 = 110
    expect(maxScoreForDifficulty('easy')).toBe(110)
    // medium: 40 * 5 + 10 = 210
    expect(maxScoreForDifficulty('medium')).toBe(210)
    // hard: 60 * 5 + 10 = 310
    expect(maxScoreForDifficulty('hard')).toBe(310)
  })
})
