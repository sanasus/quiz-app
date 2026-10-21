/**
 * Pool cursors — where the next quiz continues in a provider's ordered
 * pool, per provider + category + difficulty.
 *
 * Tiny, so it lives in localStorage like the other stores (the history
 * itself is in IndexedDB).
 */

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { z } from 'zod'
import { assertMigrationsMatchVersion } from '../../shared/lib/persist-guards'

/** Bump when the schema changes. */
export const CURSOR_STORE_VERSION = 1

/** Key = old version, value = upgrade step; one step per version bump. */
const migrations: Record<number, (data: unknown) => unknown> = {
  0: (data) => data,
}

export const cursorDataSchema = z.object({
  cursors: z.record(z.string(), z.number().int().nonnegative()),
})

type CursorData = z.infer<typeof cursorDataSchema>

export function cursorKey(
  providerId: string,
  category: string,
  difficulty: string,
): string {
  return `${providerId}|${category}|${difficulty}`
}

interface CursorStore extends CursorData {
  setCursor: (key: string, offset: number) => void
  resetCursors: () => void
}

export const useCursorStore = create<CursorStore>()(
  persist(
    (set) => ({
      cursors: {},
      setCursor: (key, offset) =>
        set((s) => ({ cursors: { ...s.cursors, [key]: offset } })),
      resetCursors: () => set({ cursors: {} }),
    }),
    {
      name: 'quiz-cursors',
      version: CURSOR_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        assertMigrationsMatchVersion(
          'cursors',
          CURSOR_STORE_VERSION,
          Object.keys(migrations).length,
        )
        let data: unknown = persisted
        for (let v = version; v < CURSOR_STORE_VERSION; v++) {
          const step = migrations[v]
          if (!step) return { cursors: {} }
          data = step(data)
        }
        return data
      },
      merge: (persisted, current) => {
        // Corrupt data must never break the app — start from the top.
        const parsed = cursorDataSchema.safeParse(persisted)
        return {
          ...current,
          ...(parsed.success ? parsed.data : { cursors: {} }),
        }
      },
      partialize: (s): CursorData => ({ cursors: s.cursors }),
    },
  ),
)
