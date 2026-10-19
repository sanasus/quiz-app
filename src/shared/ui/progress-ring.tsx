/**
 * ProgressRing — circular progress with an inset track and a rounded
 * arc. Children render in the centre (level number, percent).
 */

import type { ReactNode } from 'react'

export interface ProgressRingProps {
  value: number
  max: number
  /** Accessible name; the ring is announced as a progressbar. */
  label: string
  /** Outer diameter in px. */
  size?: number
  children?: ReactNode
}

const STROKE = 10

export function ProgressRing({
  value,
  max,
  label,
  size = 112,
  children,
}: ProgressRingProps) {
  const radius = (size - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className="relative shrink-0 rounded-full bg-bg shadow-neu-inset"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
