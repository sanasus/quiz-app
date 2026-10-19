/** Page and section headings — one type scale for every screen. */

import type { ComponentProps } from 'react'
import { cx } from '../lib/cx'

export function PageTitle({ className, ...rest }: ComponentProps<'h1'>) {
  return (
    <h1
      className={cx('mb-6 text-center text-title text-text', className)}
      {...rest}
    />
  )
}

export function SectionTitle({ className, ...rest }: ComponentProps<'h2'>) {
  return (
    <h2 className={cx('mb-3 text-subheading text-text', className)} {...rest} />
  )
}
