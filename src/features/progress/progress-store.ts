/**
 * Progress store — total XP, persisted to localStorage.
 *
 * Level is derived from XP (pure function), never stored, so a level
 * formula change cannot desync the data.
 */

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { z } from 'zod'
import { sessionXp } from './xp'
import type { SessionSummary } from '../../shared/types/meta'

/** Bump when the schema changes. */
export const PROGRESS_STORE_VERSION = 1

export const progressDataSchema = z.object({
  xp: z.number().int().nonnegative(),
})

type ProgressData = z.infer<typeof progressDataSchema>

interface ProgressStore extends ProgressData {
  /** Award XP for a finished session; returns the amount awarded. */
  awardSession: (summary: SessionSummary) => number
  /** Wipe XP (used by the stats reset). */
  resetProgress: () => void
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      xp: 0,

      awardSession: (summary) => {
        const gained = sessionXp(summary)
        set((s) => ({ xp: s.xp + gained }))
        return gained
      },

      resetProgress: () => set({ xp: 0 }),
    }),
    {
      name: 'quiz-progress',
      version: PROGRESS_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        // v0 → v1 is a no-op rename; anything older is wiped.
        if (version < 0) return { xp: 0 }
        return persisted
      },
      merge: (persisted, current) => {
        // Corrupt data must never break the app — fall back to 0 XP.
        const parsed = progressDataSchema.safeParse(persisted)
        return { ...current, ...(parsed.success ? parsed.data : { xp: 0 }) }
      },
      partialize: (s): ProgressData => ({ xp: s.xp }),
    },
  ),
)
