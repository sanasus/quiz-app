/**
 * Statistics logic — pure functions, no React.
 */

import type {
  CategoryStat,
  SessionSummary,
  StatsState,
} from '../../shared/types/meta'

/** History keeps at most this many recent sessions. */
export const HISTORY_LIMIT = 30

/** Consecutive days required for the "persistent" achievement. */
export const PERSISTENT_DAYS = 7

export function createInitialStats(): StatsState {
  return {
    totalSessions: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    bestScore: 0,
    bestStreak: 0,
    streakSum: 0,
    byCategory: {},
    byDifficulty: {},
    history: [],
    playDays: [],
  }
}

/** Local calendar date (YYYY-MM-DD) for an epoch-ms timestamp. */
export function toIsoDate(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Readable name from a category slug: `arts_and_literature` →
 * `Arts and literature`. Used when no real name is known (old data).
 */
export function formatCategorySlug(slug: string): string {
  const words = slug
    .replace(/[_\-\s]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function addToMap(
  map: Record<string, CategoryStat>,
  key: string,
  correct: number,
  total: number,
  label?: string,
): Record<string, CategoryStat> {
  const prev = map[key] ?? { correct: 0, total: 0 }
  const next: CategoryStat = {
    correct: prev.correct + correct,
    total: prev.total + total,
  }
  const nextLabel = label ?? prev.label
  if (nextLabel !== undefined) next.label = nextLabel
  return { ...map, [key]: next }
}

/**
 * Fold a finished session into the accumulated statistics.
 *
 * @param stats - stats before the session
 * @param summary - the session that just finished
 * @returns new stats (the input is not mutated)
 */
export function applySessionToStats(
  stats: StatsState,
  summary: SessionSummary,
): StatsState {
  const day = toIsoDate(summary.finishedAt)
  const playDays = stats.playDays.includes(day)
    ? stats.playDays
    : [...stats.playDays, day].sort()

  return {
    totalSessions: stats.totalSessions + 1,
    totalCorrect: stats.totalCorrect + summary.correctCount,
    totalAnswered: stats.totalAnswered + summary.totalQuestions,
    bestScore: Math.max(stats.bestScore, summary.score),
    bestStreak: Math.max(stats.bestStreak, summary.bestStreak),
    streakSum: stats.streakSum + summary.bestStreak,
    byCategory: addToMap(
      stats.byCategory,
      summary.category,
      summary.correctCount,
      summary.totalQuestions,
      summary.categoryName ?? formatCategorySlug(summary.category),
    ),
    byDifficulty: addToMap(
      stats.byDifficulty,
      summary.difficulty,
      summary.correctCount,
      summary.totalQuestions,
    ),
    history: [summary, ...stats.history].slice(0, HISTORY_LIMIT),
    playDays,
  }
}

/** Overall accuracy in percent (0 when nothing was answered). */
export function overallAccuracy(stats: StatsState): number {
  if (stats.totalAnswered === 0) return 0
  return Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
}

/** Average per-session best streak. */
export function averageStreak(stats: StatsState): number {
  if (stats.totalSessions === 0) return 0
  return Math.round((stats.streakSum / stats.totalSessions) * 10) / 10
}

/** Accuracy of a single category/difficulty bucket in percent. */
export function bucketAccuracy(bucket: CategoryStat): number {
  if (bucket.total === 0) return 0
  return Math.round((bucket.correct / bucket.total) * 100)
}

/**
 * Length of the consecutive-day streak ending at the most recent play day.
 *
 * Days are local ISO dates; gaps anywhere in the past break the streak
 * only relative to the latest day (a gap before the latest run is irrelevant).
 */
export function consecutiveDays(playDays: readonly string[]): number {
  if (playDays.length === 0) return 0
  const days = [...new Set(playDays)].sort()
  const DAY_MS = 86_400_000
  let streak = 1
  for (let i = days.length - 1; i > 0; i--) {
    const cur = Date.parse(`${days[i]}T00:00:00Z`)
    const prev = Date.parse(`${days[i - 1]}T00:00:00Z`)
    if (cur - prev === DAY_MS) {
      streak++
    } else if (cur - prev > DAY_MS) {
      break
    }
  }
  return streak
}
