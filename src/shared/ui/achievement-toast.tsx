/**
 * Achievement toast — animated unlock notification with aria-live.
 */

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
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
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) =>
      setTimeout(() => onDismiss(toast.toastKey), duration),
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, onDismiss, duration])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.toastKey}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -24, scale: 0.95 }
            }
            animate={
              reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -16, scale: 0.95 }
            }
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border-2 border-warning bg-surface p-4 shadow-lg"
          >
            <span aria-hidden="true" className="text-3xl">
              {toast.icon}
            </span>
            <div className="min-w-0">
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
