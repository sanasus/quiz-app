/**
 * Meta-layer types: statistics, achievements, XP/levels.
 */

import type { LucideIcon } from 'lucide-react'
import type { QuizMode } from './quiz'

// ---------------------------------------------------------------------------
// Session summary (normalized finished session, stored in history)
// ---------------------------------------------------------------------------

export interface SessionSummary {
  /** Epoch ms when the session finished. */
  finishedAt: number
  score: number
  correctCount: number
  totalQuestions: number
  /** Rounded 0..100. */
  accuracy: number
  bestStreak: number
  /** Seconds spent on the session. */
  timeSpent: number
  mode: QuizMode
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  /** Human-readable category name; absent only before the v2 migration. */
  categoryName?: string
  /** Question source the session ran on; category slugs are provider-specific. Absent in older history. */
  providerId?: string
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface CategoryStat {
  correct: number
  total: number
  /** Display name of the bucket (categories only); falls back to the key. */
  label?: string
}

export interface StatsState {
  totalSessions: number
  totalCorrect: number
  totalAnswered: number
  bestScore: number
  /** Best streak across all sessions. */
  bestStreak: number
  /** Sum of per-session best streaks (for the average-streak metric). */
  streakSum: number
  byCategory: Record<string, CategoryStat>
  byDifficulty: Record<string, CategoryStat>
  /** Most recent sessions first, capped. */
  history: SessionSummary[]
  /** Local ISO dates (YYYY-MM-DD) the user played on, ascending. */
  playDays: string[]
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface Achievement {
  id: string
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
  /**
   * Checked once after a session finishes.
   * @param stats - statistics snapshot AFTER the session was recorded
   * @param session - the session that just finished
   */
  check: (stats: StatsState, session: SessionSummary) => boolean
}
