/** TextLink — an inline external link with an underline (attribution etc.). */

import type { ComponentProps } from 'react'
import { cx } from '../lib/cx'

export function TextLink({ className, ...rest }: ComponentProps<'a'>) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        'underline decoration-text-3/40 underline-offset-2 transition-colors hover:text-text',
        className,
      )}
      {...rest}
    />
  )
}
