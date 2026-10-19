/** Chip — a small pressed-in label (dates, tags). */

import type { ComponentProps } from 'react'
import { cx } from '../lib/cx'

export function Chip({ className, ...rest }: ComponentProps<'span'>) {
  return (
    <span
      className={cx(
        'rounded-full bg-bg px-3 py-1 text-caption text-text-2 shadow-neu-inset-sm',
        className,
      )}
      {...rest}
    />
  )
}
