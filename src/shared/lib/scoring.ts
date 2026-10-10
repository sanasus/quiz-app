/**
 * Scoring logic — pure functions, no React.
 *
 * Formula:
 *   base  = 20 (easy) | 40 (medium) | 60 (hard)
 *   speed = min(10, floor(timeSec / 5))
 *   streakMult = 1 + min(streak / 5, 4) * 0.2  (max 5x)
 *   score = base * streakMult + speed
 */

export type Difficulty = 'easy' | 'medium' | 'hard'

const BASE_SCORES: Record<Difficulty, number> = {
  easy: 20,
  medium: 40,
  hard: 60,
}

/**
 * Calculate points for a single correct answer.
 * @param difficulty - question difficulty
 * @param timeSec - time spent on this question in seconds
 * @param streak - current correct streak count
 * @returns calculated score
 */
export function calculateScore(
  difficulty: Difficulty,
  timeSec: number,
  streak: number,
): number {
  const base = BASE_SCORES[difficulty] ?? BASE_SCORES.easy
  const speed = Math.min(10, Math.floor(timeSec / 5))
  const streakMult = 1 + Math.min(streak / 5, 4) * 0.2
  return Math.round(base * streakMult + speed)
}

/**
 * Calculate the maximum possible score for a difficulty level
 * (used for UI progress bars, etc.)
 */
export function maxScoreForDifficulty(difficulty: Difficulty): number {
  // Max streak mult = 5x, max speed = 10
  return Math.round(BASE_SCORES[difficulty] * 5 + 10)
}
