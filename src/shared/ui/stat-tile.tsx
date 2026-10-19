/** StatTile — a small raised tile with a big value over a caption. */

import type { ReactNode } from 'react'
import { Card } from './card'
import { cx } from '../lib/cx'

export interface StatTileProps {
  label: string
  children: ReactNode
  /** Value colour class (defaults to the body text colour). */
  tone?: string
  /** Test hook on the value element. */
  valueTestId?: string
}

export function StatTile({
  label,
  children,
  tone = 'text-text',
  valueTestId,
}: StatTileProps) {
  return (
    <Card variant="tile" className="text-center">
      <div data-testid={valueTestId} className={cx('text-2xl font-bold', tone)}>
        {children}
      </div>
      <div className="text-xs text-text-2">{label}</div>
    </Card>
  )
}
