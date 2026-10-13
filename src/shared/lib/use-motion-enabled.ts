/**
 * useMotionEnabled — single source of truth for "may I animate?".
 *
 * Combines the /settings toggle with the OS reduced-motion preference.
 * Every Motion usage in the app must consult this hook.
 */

import { useReducedMotion } from 'motion/react'
import { useSettingsStore } from '../../app/settings-store'

export function useMotionEnabled(): boolean {
  const animations = useSettingsStore((s) => s.animations)
  const reducedMotion = useReducedMotion()

  return animations && !reducedMotion
}
