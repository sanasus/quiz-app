/**
 * Settings store — persisted UI preferences (theme, animations).
 *
 * Language is not here: i18next persists it itself (localStorage cache).
 */

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { z } from 'zod'
import { assertMigrationsMatchVersion } from '../shared/lib/persist-guards'

/** Bump when the schema changes. */
export const SETTINGS_STORE_VERSION = 1

/** Key = old version, value = upgrade step; one step per version bump. */
const migrations: Record<number, (data: unknown) => unknown> = {
  // v0 payloads predate the schema: reset to defaults.
  0: () => ({ ...DEFAULT_SETTINGS }),
}

export const themeSettingSchema = z.enum(['light', 'dark', 'system'])

export const settingsSchema = z.object({
  theme: themeSettingSchema,
  animations: z.boolean(),
})

export type ThemeSetting = z.infer<typeof themeSettingSchema>
export type SettingsData = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: SettingsData = {
  theme: 'system',
  animations: true,
}

/**
 * Resolve the stored theme setting against the OS preference.
 * Pure — unit-testable without a DOM.
 */
export function resolveTheme(
  setting: ThemeSetting,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (setting === 'system') return prefersDark ? 'dark' : 'light'
  return setting
}

/** Current OS dark-mode preference (safe outside a browser). */
export function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

interface SettingsStore extends SettingsData {
  setTheme: (theme: ThemeSetting) => void
  setAnimations: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setTheme: (theme) => set({ theme }),
      setAnimations: (enabled) => set({ animations: enabled }),
    }),
    {
      name: 'quiz-settings',
      version: SETTINGS_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        assertMigrationsMatchVersion(
          'settings',
          SETTINGS_STORE_VERSION,
          Object.keys(migrations).length,
        )
        let data: unknown = persisted
        for (let v = version; v < SETTINGS_STORE_VERSION; v++) {
          const step = migrations[v]
          if (!step) return { ...DEFAULT_SETTINGS }
          data = step(data)
        }
        return data
      },
      merge: (persisted, current) => {
        // Corrupt data must never break the app — fall back to defaults.
        const parsed = settingsSchema.safeParse(persisted)
        return {
          ...current,
          ...(parsed.success ? parsed.data : DEFAULT_SETTINGS),
        }
      },
      partialize: (s): SettingsData => ({
        theme: s.theme,
        animations: s.animations,
      }),
    },
  ),
)
