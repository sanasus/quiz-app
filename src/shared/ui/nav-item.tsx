/**
 * NavItem — one entry of the app navigation.
 *   pill — desktop header: icon + label, pressed-in when active
 *   tab  — mobile bottom bar: stacked icon + label
 */

import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { cx } from '../lib/cx'

export interface NavItemProps {
  to: string
  icon: LucideIcon
  label: string
  active: boolean
  variant?: 'pill' | 'tab'
}

export function NavItem({
  to,
  icon: Icon,
  label,
  active,
  variant = 'pill',
}: NavItemProps) {
  if (variant === 'tab') {
    return (
      <Link
        to={to}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors hover:text-text',
          active ? 'text-text' : 'text-text-3',
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span aria-hidden="true">{label}</span>
      </Link>
    )
  }

  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-text',
        active ? 'text-text shadow-neu-inset-sm' : 'text-text-2',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  )
}
