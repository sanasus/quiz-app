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
import { Card } from './card'
import { IconButton } from './icon-button'

export interface AppToastProps {
  message: string
  /** Optional bold first line above the message. */
  title?: string
  onDismiss: () => void
  /** Auto-dismiss delay in ms. */
  duration?: number
  /** Screen edge to stick to; `bottom` avoids the achievement toasts. */
  position?: 'top' | 'bottom'
}

export function AppToast({
  message,
  title,
  onDismiss,
  duration = 5000,
  position = 'top',
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
      className={`fixed inset-x-0 z-50 flex justify-center px-4 ${position === 'top' ? 'top-4' : 'bottom-16'}`}
    >
      <Card
        variant="overlay"
        className="flex w-full max-w-sm items-center gap-3 border-2 border-primary"
      >
        <div className="min-w-0 flex-1">
          {title ? <p className="mb-0.5 font-bold text-text">{title}</p> : null}
          <p className="text-body text-text">{message}</p>
        </div>
        <IconButton aria-label={t('common.close')} onClick={onDismiss}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </Card>
    </div>
  )
}
