/**
 * Achievement toast — animated unlock notification with aria-live.
 *
 * Animations honor the global /settings toggle (useMotionEnabled), the
 * toast can be dismissed manually, and the auto-dismiss timer pauses
 * while the pointer or keyboard focus is inside it.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useMotionEnabled } from '../lib/use-motion-enabled'
import type { Achievement } from '../types/meta'

export interface AchievementToastItem extends Achievement {
  /** Unique key per appearance (same id may unlock again after a reset). */
  toastKey: string
}

interface AchievementToastProps {
  toasts: AchievementToastItem[]
  onDismiss: (toastKey: string) => void
  /** Auto-dismiss delay in ms. */
  duration?: number
}

export function AchievementToast({
  toasts,
  onDismiss,
  duration = 5000,
}: AchievementToastProps) {
  const { t } = useTranslation()
  const motionEnabled = useMotionEnabled()
  const [paused, setPaused] = useState(false)

  // Restart the countdown whenever the queue or the pause state changes:
  // pausing clears the timers, resuming schedules a fresh full window.
  useEffect(() => {
    if (toasts.length === 0 || paused) return
    const timers = toasts.map((toast) =>
      setTimeout(() => onDismiss(toast.toastKey), duration),
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, onDismiss, duration, paused])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
      aria-atomic="false"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.toastKey}
            initial={
              motionEnabled
                ? { opacity: 0, y: -24, scale: 0.95 }
                : { opacity: 0 }
            }
            animate={
              motionEnabled ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }
            }
            exit={
              motionEnabled
                ? { opacity: 0, y: -16, scale: 0.95 }
                : { opacity: 0 }
            }
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-card border-2 border-warning bg-surface p-4 shadow-lg"
          >
            <span aria-hidden="true" className="text-3xl">
              {toast.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-text-2">
                {t('achievements.unlocked')}
              </p>
              <p className="truncate font-bold text-text">
                {t(toast.titleKey)}
              </p>
              <p className="truncate text-sm text-text-2">
                {t(toast.descriptionKey)}
              </p>
            </div>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => onDismiss(toast.toastKey)}
              className="shrink-0 rounded-full p-2 text-text-3 shadow-neu transition-shadow hover:text-text hover:shadow-neu-lift active:shadow-neu-inset-sm"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
