/**
 * Answer-checking utilities.
 */

export function checkAnswer(
  correctOptionIds: readonly string[],
  selectedIds: readonly string[],
): boolean {
  if (correctOptionIds.length !== selectedIds.length) return false
  const correctSet = new Set(correctOptionIds)
  return selectedIds.every((id) => correctSet.has(id))
}

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
