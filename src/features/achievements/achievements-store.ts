/**
 * Achievements store — unlocked ids with the date earned, persisted.
 */

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { z } from 'zod'
import type { UnlockedMap } from './registry'

/** Bump when the schema changes. */
export const ACHIEVEMENTS_STORE_VERSION = 1

export const achievementsDataSchema = z.object({
  unlocked: z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
})

type AchievementsData = z.infer<typeof achievementsDataSchema>

interface AchievementsStore extends AchievementsData {
  /** Mark achievements as unlocked today; returns nothing. */
  unlock: (ids: string[], todayIso: string) => void
  /** Wipe all unlocks (used by the stats reset). */
  resetAchievements: () => void
}

export const useAchievementsStore = create<AchievementsStore>()(
  persist(
    (set) => ({
      unlocked: {},

      unlock: (ids, todayIso) =>
        set((s) => {
          const next: UnlockedMap = { ...s.unlocked }
          for (const id of ids) {
            if (next[id] === undefined) next[id] = todayIso
          }
          return { unlocked: next }
        }),

      resetAchievements: () => set({ unlocked: {} }),
    }),
    {
      name: 'quiz-achievements',
      version: ACHIEVEMENTS_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        if (version < 0) return { unlocked: {} }
        return persisted
      },
      merge: (persisted, current) => {
        // Corrupt data must never break the app — fall back to empty.
        const parsed = achievementsDataSchema.safeParse(persisted)
        return {
          ...current,
          ...(parsed.success ? parsed.data : { unlocked: {} }),
        }
      },
      partialize: (s): AchievementsData => ({ unlocked: s.unlocked }),
    },
  ),
)
