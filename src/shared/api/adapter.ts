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
  // Use the answers array (new format): [{ id, text, isCorrect }]
  const answers = raw.answers

  // Validation: must have answers array with items
  if (!Array.isArray(answers) || answers.length < 2) {
    return null
  }

  // Collect options and correct option IDs from isCorrect boolean
  const options: { id: string; text: string }[] = []
  const correctOptionIds: string[] = []

  for (const ans of answers) {
    options.push({ id: ans.id, text: ans.text })
    if (ans.isCorrect) {
      correctOptionIds.push(ans.id)
    }
  }

  // Validation: at least one correct answer
  if (correctOptionIds.length === 0) {
    return null
  }

  // Determine if multiple correct answers
  const multiple = correctOptionIds.length > 1

  // Map uppercase difficulty to lowercase
  const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
  }
  const difficulty = difficultyMap[raw.difficulty] ?? 'medium'

  return {
    id: raw.id,
    text: raw.text,
    description: raw.description ?? undefined,
    explanation: raw.explanation ?? undefined,
    options,
    correctOptionIds,
    multiple,
    category: raw.category ?? undefined,
    difficulty,
  }
}

/**
 * Adapt an array of raw API questions, filtering out invalid ones.
 */
export function adaptQuestions(raw: QuizApiQuestion[]): Question[] {
  return raw.map(adaptQuestion).filter((q): q is Question => q !== null)
}
