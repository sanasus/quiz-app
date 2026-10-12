/**
 * Convert a finished session result into a normalized stats summary.
 */

import type { SessionResult } from '../../shared/types/quiz'
import type { SessionSummary } from '../../shared/types/meta'

export function toSessionSummary(result: SessionResult): SessionSummary {
  return {
    finishedAt: result.finishedAt,
    score: result.score,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    accuracy:
      result.totalQuestions > 0
        ? Math.round((result.correctCount / result.totalQuestions) * 100)
        : 0,
    bestStreak: result.bestStreak,
    timeSpent: result.timeSpent,
    mode: result.mode,
    difficulty: result.difficulty,
    category: result.category,
  }
}
