/**
 * Difficulty levels supported by the internal model.
 *
 * The QuizAPI metadata also reports EXPERT, but the app supports
 * easy/medium/hard end to end (types, scoring, /quiz config schema,
 * stats schema — see README «Ограничения»). Unknown API values are
 * filtered out on /setup instead of being rendered as a button that
 * can never start a quiz.
 */

export type Difficulty = 'easy' | 'medium' | 'hard'

/** Every level the app supports, in ascending order. */
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard']

/**
 * Narrow an arbitrary API difficulty string to a supported level.
 * Accepts the lowercase internal form (the API's uppercase values are
 * lowercased by the caller).
 */
export function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value)
}
