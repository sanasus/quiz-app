/**
 * Adapter: raw trivia question → internal Question model.
 *
 * Ported verbatim from the frontend's triviaapi.ts so live behaviour is
 * unchanged. The trivia API returns one correct and N incorrect answer
 * strings (not an options array), so option ids are synthesised here.
 */

import type { Question } from '../types'
import type { TriviaApiQuestion } from './trivia.schemas'

/** Fisher–Yates shuffle (in place, returns the same array). */
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swapped = items[i]
    items[i] = items[j]
    items[j] = swapped
  }
  return items
}

/**
 * Adapt a single raw trivia question to the internal model.
 * Returns `null` for unusable questions (empty or duplicated answers
 * leaving fewer than two distinct options) — the caller filters them.
 */
export function adaptTriviaQuestion(raw: TriviaApiQuestion): Question | null {
  const shuffled = shuffle([raw.correctAnswer, ...raw.incorrectAnswers])

  // Drop empty/whitespace-only answers, then dedupe by text keeping the
  // first occurrence after the shuffle.
  const seen = new Set<string>()
  const texts = shuffled.filter((text) => {
    if (text.trim() === '') return false
    if (seen.has(text)) return false
    seen.add(text)
    return true
  })

  if (texts.length < 2) return null

  // Option ids are synthesised after the shuffle, so they always match
  // the final (deduped) option list.
  const options = texts.map((text, index) => ({
    id: `${raw.id}-${index}`,
    text,
  }))
  const correctOptionIds = options
    .filter((option) => option.text === raw.correctAnswer)
    .map((option) => option.id)

  // The correct answer itself was empty/dropped — unusable question.
  if (correctOptionIds.length === 0) return null

  return {
    id: raw.id,
    text: raw.question.text,
    options,
    correctOptionIds,
    multiple: false,
    explanation: undefined,
    category: raw.category,
    difficulty: raw.difficulty,
  }
}
