/**
 * Answer checking — the one definition of «correct» used by the session
 * store, the quiz screen, the results and the analytics.
 */

/** Correct = the selected option set equals the correct option set. */
export function checkAnswer(
  correctOptionIds: readonly string[],
  selectedIds: readonly string[],
): boolean {
  if (correctOptionIds.length !== selectedIds.length) return false
  const correctSet = new Set(correctOptionIds)
  return selectedIds.every((id) => correctSet.has(id))
}
