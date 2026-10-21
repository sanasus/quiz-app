/**
 * Answer-counting utilities (the correctness rule itself: shared/lib/answers).
 */

import { checkAnswer } from '../../../shared/lib/answers'

export function countCorrect(
  questions: readonly { id: string; correctOptionIds: readonly string[] }[],
  answers: Record<string, readonly string[]>,
  start: number,
  end: number,
): number {
  let count = 0
  for (let i = start; i < end; i += 1) {
    const q = questions[i]
    const selected = answers[q.id] ?? []
    if (checkAnswer(q.correctOptionIds, selected)) count += 1
  }
  return count
}
