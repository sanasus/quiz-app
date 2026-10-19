/**
 * ProgressBar — inset track with a coloured fill. Announced as a
 * progressbar when `label` is given, otherwise decorative.
 */

import { cx } from '../lib/cx'

export interface ProgressBarProps {
  value: number
  max: number
  /** Accessible name; omit for a purely decorative bar. */
  label?: string
  /** Fill colour class. */
  fillClassName?: string
  /** Fill transition classes. */
  animate?: string
  className?: string
}

export function ProgressBar({
  value,
  max,
  label,
  fillClassName = 'bg-primary',
  animate = 'transition-[width]',
  className,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const a11y = label
    ? {
        role: 'progressbar' as const,
        'aria-valuemin': 0,
        'aria-valuemax': max,
        'aria-valuenow': value,
        'aria-label': label,
      }
    : { 'aria-hidden': true as const }

  return (
    <div
      className={cx(
        'h-3 overflow-hidden rounded-full bg-bg shadow-neu-inset-sm',
        className,
      )}
      {...a11y}
    >
      <div
        className={cx('h-full rounded-full', fillClassName, animate)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
