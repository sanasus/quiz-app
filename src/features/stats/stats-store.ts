/**
 * Stats store — Zustand + persist (localStorage).
 *
 * Data is validated with Zod on load and migrated across versions.
 * Only data is persisted (see `partialize`); actions live in the store.
 */

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { SessionSummary, StatsState } from '../../shared/types/meta'
import { applySessionToStats, createInitialStats } from './stats-logic'
import {
  STATS_STORE_VERSION,
  parsePersistedStats,
  statsDataSchema,
} from './stats-schema'

interface StatsStore extends StatsState {
  /** Fold a finished session into the statistics. */
  recordSession: (summary: SessionSummary) => void
  /** Wipe all statistics (keeps achievements/XP intact). */
  resetStats: () => void
}

export const useStatsStore = create<StatsStore>()(
  persist(
    (set) => ({
      ...createInitialStats(),

      recordSession: (summary) => set((s) => applySessionToStats(s, summary)),

      resetStats: () => set(createInitialStats()),
    }),
    {
      name: 'quiz-stats',
      version: STATS_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Upgrade old payloads, then validate; corrupt data → initial state.
      migrate: (persisted, version) => parsePersistedStats(persisted, version),
      merge: (persisted, current) => {
        // migrate() already validated; keep actions from `current`.
        const parsed = statsDataSchema.safeParse(persisted)
        const data = parsed.success ? parsed.data : createInitialStats()
        return { ...current, ...data }
      },
      // Persist data only — actions are not serializable.
      partialize: (s): StatsState => ({
        totalSessions: s.totalSessions,
        totalCorrect: s.totalCorrect,
        totalAnswered: s.totalAnswered,
        bestScore: s.bestScore,
        bestStreak: s.bestStreak,
        streakSum: s.streakSum,
        byCategory: s.byCategory,
        byDifficulty: s.byDifficulty,
        history: s.history,
        playDays: s.playDays,
      }),
    },
  ),
)
