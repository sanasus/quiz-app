/** Field — a labelled form row (label above, control below). */

import type { ComponentProps, ReactNode } from 'react'

export interface FieldProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Visible label text. */
  label: ReactNode
  /** id of the label element (for aria-labelledby on the control). */
  labelId?: string
  /** Native control id, when the control is a labelable element. */
  htmlFor?: string
  children: ReactNode
}

export function Field({
  label,
  labelId,
  htmlFor,
  children,
  ...rest
}: FieldProps) {
  return (
    <div {...rest}>
      <label
        id={labelId}
        htmlFor={htmlFor}
        className="mb-2 block cursor-default text-label text-text-2"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
