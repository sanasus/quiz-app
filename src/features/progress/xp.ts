/**
 * XP and levels — pure functions, no React.
 *
 * XP per session = round(score / 10).
 * Levels are quadratic: level L is reached at 50 * L² XP, so
 *   level(xp) = floor(sqrt(xp / 50)).
 */

import type { SessionSummary } from '../../shared/types/meta'

/** XP required to reach the given level (start of the level). */
export function xpForLevel(level: number): number {
  return 50 * level * level
}

/** Current level for a total XP amount. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50))
}

/** XP earned by a finished session. */
export function sessionXp(summary: SessionSummary): number {
  return Math.round(summary.score / 10)
}

export interface XpProgress {
  /** Current level. */
  level: number
  /** XP earned within the current level. */
  into: number
  /** XP still needed for the next level. */
  need: number
}

/** Level plus progress toward the next level. */
export function xpProgress(xp: number): XpProgress {
  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, into: xp - base, need: next - base }
}
