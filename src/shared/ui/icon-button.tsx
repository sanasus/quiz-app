/** IconButton — round raised button holding one icon. Needs an aria-label. */

import type { ComponentProps } from 'react'
import { cx } from '../lib/cx'

export interface IconButtonProps extends ComponentProps<'button'> {
  'aria-label': string
}

export function IconButton({
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'shrink-0 cursor-pointer rounded-full p-2 text-text-3 shadow-neu transition-shadow hover:text-text hover:shadow-neu-lift active:shadow-neu-inset-sm',
        className,
      )}
      {...rest}
    />
  )
}
