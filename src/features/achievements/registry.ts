/**
 * Achievement registry — declarative rules, pure functions, no React.
 *
 * Every check runs once after a session finishes, against the stats
 * snapshot AFTER that session was recorded (cumulative rules like
 * «category expert» see their own session's contribution).
 */

import type {
  Achievement,
  SessionSummary,
  StatsState,
} from '../../shared/types/meta'
import { consecutiveDays, PERSISTENT_DAYS } from '../stats/stats-logic'

/** Questions answered in Survival for the «survivor» achievement. */
export const SURVIVOR_QUESTIONS = 20

/** Correct answers in one category for the «expert» achievement. */
export const EXPERT_CORRECT = 50

/** Streak for the «streak_10» achievement. */
export const STREAK_10 = 10

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    icon: '🩸',
    titleKey: 'achievements.first_blood',
    descriptionKey: 'achievements.first_blood_desc',
    check: (stats) => stats.totalSessions >= 1,
  },
  {
    id: 'streak_10',
    icon: '🔥',
    titleKey: 'achievements.streak_10',
    descriptionKey: 'achievements.streak_10_desc',
    check: (_stats, session) => session.bestStreak >= STREAK_10,
  },
  {
    id: 'perfectionist',
    icon: '💎',
    titleKey: 'achievements.perfectionist',
    descriptionKey: 'achievements.perfectionist_desc',
    check: (_stats, session) =>
      session.difficulty === 'hard' &&
      session.totalQuestions > 0 &&
      session.correctCount === session.totalQuestions,
  },
  {
    id: 'speedster',
    icon: '⚡',
    titleKey: 'achievements.speedster',
    descriptionKey: 'achievements.speedster_desc',
    check: (_stats, session) =>
      session.mode === 'blitz' &&
      session.totalQuestions > 0 &&
      session.correctCount === session.totalQuestions,
  },
  {
    id: 'survivor',
    icon: '🛡️',
    titleKey: 'achievements.survivor',
    descriptionKey: 'achievements.survivor_desc',
    check: (_stats, session) =>
      session.mode === 'survival' &&
      session.totalQuestions >= SURVIVOR_QUESTIONS,
  },
  {
    id: 'expert',
    icon: '🎓',
    titleKey: 'achievements.expert',
    descriptionKey: 'achievements.expert_desc',
    check: (stats) =>
      Object.values(stats.byCategory).some((b) => b.correct >= EXPERT_CORRECT),
  },
  {
    id: 'persistent',
    icon: '📅',
    titleKey: 'achievements.persistent',
    descriptionKey: 'achievements.persistent_desc',
    check: (stats) => consecutiveDays(stats.playDays) >= PERSISTENT_DAYS,
  },
]

/** Unlocked state: achievement id → local ISO date it was earned on. */
export type UnlockedMap = Record<string, string>

/**
 * Newly unlocked achievements for a finished session.
 *
 * Pure and idempotent: already-unlocked achievements are skipped, so
 * calling it again with the same inputs yields nothing new.
 *
 * @param stats - stats AFTER the session was recorded
 * @param session - the session that just finished
 * @param unlocked - current unlocked map
 */
export function checkAchievements(
  stats: StatsState,
  session: SessionSummary,
  unlocked: UnlockedMap,
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => unlocked[a.id] === undefined && a.check(stats, session),
  )
}
