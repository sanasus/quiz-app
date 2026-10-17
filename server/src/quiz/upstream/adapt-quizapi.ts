/**
 * Adapter: raw QuizAPI question → internal Question model.
 *
 * Rules (identical to the frontend's former adapter.ts, so live
 * behaviour does not shift during the move to the server):
 * - drop questions with fewer than 2 options,
 * - drop questions with no correct answer,
 * - uppercase API difficulty → lowercase internal difficulty.
 */

import type { Question } from '../types'
import type { QuizApiQuestion } from './quizapi.schemas'

/** Uppercase API difficulty → lowercase internal difficulty. */
const DIFFICULTY_MAP: Record<string, Question['difficulty']> = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
}

/**
 * Adapt a single raw API question to the internal model.
 * Returns `null` if the question should be dropped.
 */
export function adaptQuestion(raw: QuizApiQuestion): Question | null {
  const answers = raw.answers

  if (!Array.isArray(answers) || answers.length < 2) {
    return null
  }

  const options: { id: string; text: string }[] = []
  const correctOptionIds: string[] = []

  for (const ans of answers) {
    options.push({ id: ans.id, text: ans.text })
    if (ans.isCorrect) {
      correctOptionIds.push(ans.id)
    }
  }

  if (correctOptionIds.length === 0) {
    return null
  }

  return {
    id: raw.id,
    text: raw.text,
    description: raw.description ?? undefined,
    explanation: raw.explanation ?? undefined,
    options,
    correctOptionIds,
    multiple: correctOptionIds.length > 1,
    category: raw.category ?? undefined,
    difficulty: DIFFICULTY_MAP[raw.difficulty] ?? 'medium',
  }
}
