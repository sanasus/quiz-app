/**
 * Card — the one surface container.
 *   raised  — main content block (page sections, forms)
 *   tile    — small raised block (stat tiles, list items)
 *   inset   — pressed-in block (explanations, nested lists)
 *   overlay — floats above a backdrop (dialogs, toasts)
 */

import type { ComponentProps } from 'react'
import { cardClass, type CardPadding, type CardVariant } from './card-styles'

export interface CardProps extends ComponentProps<'div'> {
  variant?: CardVariant
  padding?: CardPadding
}

export function Card({
  variant = 'raised',
  padding = 'md',
  className,
  ...rest
}: CardProps) {
  return <div className={cardClass(variant, padding, className)} {...rest} />
}
