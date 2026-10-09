/**
 * Adapter: converts raw QuizAPI responses to the internal Question model.
 *
 * Rules:
 * - Drop questions with no text.
 * - Drop questions with no correct answer.
 * - Drop questions with fewer than 2 options.
 */

import type { QuizApiQuestion } from './schemas'
import type { Question } from '../types/quiz'

/**
 * Adapt a single raw API question to the internal model.
 * Returns `null` if the question should be dropped.
 */
export function adaptQuestion(raw: QuizApiQuestion): Question | null {
  // Collect options and correct option IDs
  const options: { id: string; text: string }[] = []
  const correctOptionIds: string[] = []

  for (const [key, text] of Object.entries(raw.answers)) {
    options.push({ id: key, text })

    const correctKey = `${key}_correct` as keyof typeof raw.correct_answers
    if (raw.correct_answers[correctKey] === 'true') {
      correctOptionIds.push(key)
    }
  }

  // Validation: minimum 2 options
  if (options.length < 2) {
    return null
  }

  // Validation: at least one correct answer
  if (correctOptionIds.length === 0) {
    return null
  }

  const multiple = raw.multiple_correct_answers === 'true'

  return {
    id: String(raw.id),
    text: raw.question,
    description: raw.description ?? undefined,
    explanation: raw.explanation ?? undefined,
    options,
    correctOptionIds,
    multiple,
    category: raw.category,
    difficulty: raw.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
  }
}

/**
 * Adapt an array of raw API questions, filtering out invalid ones.
 */
export function adaptQuestions(raw: QuizApiQuestion[]): Question[] {
  return raw.map(adaptQuestion).filter((q): q is Question => q !== null)
}
