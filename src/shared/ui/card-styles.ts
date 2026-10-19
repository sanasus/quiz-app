/** Class recipes for the Card surface (also used by motion wrappers). */

import { cx } from '../lib/cx'

export type CardVariant = 'raised' | 'tile' | 'inset' | 'overlay'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl'

const variants: Record<CardVariant, string> = {
  raised: 'rounded-card bg-surface shadow-card',
  tile: 'rounded-tile bg-surface shadow-neu',
  inset: 'rounded-tile bg-bg shadow-neu-inset',
  overlay: 'rounded-card bg-surface shadow-xl',
}

const paddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
}

export function cardClass(
  variant: CardVariant = 'raised',
  padding: CardPadding = 'md',
  extra?: string,
): string {
  return cx(variants[variant], paddings[padding], extra)
}
