/**
 * Button — the one button component. Router <Link>s that must look like
 * buttons use `buttonClass` from ./button-styles.
 */

import type { ComponentProps } from 'react'
import {
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles'

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  )
}
