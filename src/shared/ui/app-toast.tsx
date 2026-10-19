/**
 * App toast — reusable transient notification with aria-live.
 *
 * Same visual pattern as AchievementToast (fixed top position,
 * surface card, manual dismiss) but generic: a plain message and an
 * auto-dismiss timer; hover-pause and motion are intentionally
 * omitted to keep the component trivial.
 */

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

export interface AppToastProps {
  message: string
  /** Optional bold first line above the message. */
  title?: string
  onDismiss: () => void
  /** Auto-dismiss delay in ms. */
  duration?: number
}

export function AppToast({
  message,
  title,
  onDismiss,
  duration = 5000,
}: AppToastProps) {
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className="flex w-full max-w-sm items-center gap-3 rounded-card border-2 border-primary bg-surface p-4 shadow-lg">
        <div className="min-w-0 flex-1">
          {title ? <p className="mb-0.5 font-bold text-text">{title}</p> : null}
          <p className="text-sm text-text">{message}</p>
        </div>
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1.5 text-text-3 transition-colors hover:bg-muted hover:text-text"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
