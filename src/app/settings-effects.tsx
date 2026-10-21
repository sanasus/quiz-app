/**
 * Applies persisted settings to the document.
 *
 * Rendered once inside <Providers>: keeps `data-theme` / `color-scheme`
 * in sync with the store and tracks the OS preference while the theme
 * is set to "system".
 */

import { useEffect } from 'react'
import { prefersDark, resolveTheme, useSettingsStore } from './settings-store'

export function SettingsEffects() {
  const theme = useSettingsStore((s) => s.theme)
  const animations = useSettingsStore((s) => s.animations)

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(theme, prefersDark())
      const root = document.documentElement
      root.dataset.theme = resolved
      root.style.colorScheme = resolved

      const meta = document.querySelector('meta[name="theme-color"]')
      meta?.setAttribute('content', resolved === 'dark' ? '#211d33' : '#e6e2f6')
    }

    apply()

    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.motion = animations ? 'on' : 'off'
  }, [animations])

  return null
}
