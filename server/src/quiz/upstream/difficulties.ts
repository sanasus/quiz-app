/**
 * Narrow an arbitrary list of API difficulty strings to the levels the
 * internal model supports end to end.
 *
 * Mirrors the client's former /setup filter (lowercase + isDifficulty):
 * QuizAPI reports EXPERT, which is dropped rather than surfacing a
 * button that could never start a quiz.
 */

import type { Difficulty } from '../types'

/** Every level the app supports, in ascending order. */
const SUPPORTED: readonly Difficulty[] = ['easy', 'medium', 'hard']

/**
 * Lowercase, keep only supported levels, dedupe. The upstream order is
 * preserved so the UI renders easy → medium → hard exactly as the API
 * reported them (already ascending for both providers).
 */
export function narrowDifficulties(values: string[]): Difficulty[] {
  const seen = new Set<Difficulty>()
  const result: Difficulty[] = []

  for (const value of values) {
    const lower = value.toLowerCase()
    if (
      (SUPPORTED as readonly string[]).includes(lower) &&
      !seen.has(lower as Difficulty)
    ) {
      const difficulty = lower as Difficulty
      seen.add(difficulty)
      result.push(difficulty)
    }
  }

  return result
}
