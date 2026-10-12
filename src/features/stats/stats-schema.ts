/**
 * Zod schema for the persisted stats store + versioned migrations.
 *
 * The persisted shape is data-only (no actions). Loaded state is
 * validated: anything invalid falls back to the initial stats.
 */

import { z } from 'zod'
import type { StatsState } from '../../shared/types/meta'
import { createInitialStats, HISTORY_LIMIT } from './stats-logic'

/** Bump when the schema changes; add a step to `migrations`. */
export const STATS_STORE_VERSION = 1

const categoryStatSchema = z.object({
  correct: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
})

const sessionSummarySchema = z.object({
  finishedAt: z.number(),
  score: z.number(),
  correctCount: z.number().int().nonnegative(),
  totalQuestions: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(100),
  bestStreak: z.number().int().nonnegative(),
  timeSpent: z.number().nonnegative(),
  mode: z.enum(['classic', 'timed', 'blitz', 'survival']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: z.string(),
})

export const statsDataSchema = z.object({
  totalSessions: z.number().int().nonnegative(),
  totalCorrect: z.number().int().nonnegative(),
  totalAnswered: z.number().int().nonnegative(),
  bestScore: z.number(),
  bestStreak: z.number().int().nonnegative(),
  streakSum: z.number().nonnegative(),
  byCategory: z.record(z.string(), categoryStatSchema),
  byDifficulty: z.record(z.string(), categoryStatSchema),
  history: z.array(sessionSummarySchema).max(HISTORY_LIMIT),
  playDays: z.array(z.string()),
})

export type StatsData = z.infer<typeof statsDataSchema>

/**
 * Versioned migrations: key = old version, value = upgrade step.
 * v0 → v1: introduce bestStreak/streakSum/playDays with defaults.
 */
const migrations: Record<
  number,
  (data: Record<string, unknown>) => Record<string, unknown>
> = {
  0: (data) => ({
    ...data,
    bestStreak: 0,
    streakSum: 0,
    playDays: [],
  }),
}

/**
 * Upgrade a persisted payload from `version` to the current version,
 * then validate. Returns initial stats when anything is wrong — a
 * corrupt localStorage entry must never break the app.
 */
export function parsePersistedStats(
  persisted: unknown,
  version: number,
): StatsState {
  let data: unknown = persisted
  for (let v = version; v < STATS_STORE_VERSION; v++) {
    const step = migrations[v]
    if (!step || data === null || typeof data !== 'object') {
      return createInitialStats()
    }
    data = step(data as Record<string, unknown>)
  }
  const parsed = statsDataSchema.safeParse(data)
  return parsed.success ? parsed.data : createInitialStats()
}
