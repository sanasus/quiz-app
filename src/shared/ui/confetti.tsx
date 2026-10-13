/**
 * Confetti — one-shot celebratory burst for a good result.
 *
 * Purely decorative (aria-hidden, pointer-events-none) and rendered only
 * when animations are allowed (settings toggle + OS reduced-motion).
 * Pieces are derived from a seeded PRNG so render stays pure; when the
 * burst ends they simply unmount with the component.
 */

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useMotionEnabled } from '../lib/use-motion-enabled'

const PIECE_COUNT = 48

/** Palette of tokens that read well on both themes. */
const COLORS = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
  'var(--color-info)',
]

/** Pure, seeded pseudo-random in [0, 1) — keeps render deterministic. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface Piece {
  id: number
  /** Horizontal position in %. */
  left: number
  color: string
  delay: number
  duration: number
  drift: number
  spin: number
}

function buildPieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, id) => ({
    id,
    left: rand(id + 1) * 100,
    color: COLORS[id % COLORS.length],
    delay: rand(id + 2) * 0.8,
    duration: 1.8 + rand(id + 3) * 1.2,
    drift: (rand(id + 4) - 0.5) * 120,
    spin: (rand(id + 5) > 0.5 ? 1 : -1) * (360 + rand(id + 6) * 720),
  }))
}

export function Confetti({ show }: { show: boolean }) {
  const motionEnabled = useMotionEnabled()
  const active = show && motionEnabled
  const pieces = useMemo(() => (active ? buildPieces() : []), [active])

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block h-3 w-2 rounded-sm"
          style={{ left: `${p.left}%`, backgroundColor: p.color }}
          initial={{ y: -24, opacity: 1, x: 0, rotate: 0 }}
          animate={{
            y: '105vh',
            opacity: [1, 1, 0],
            x: p.drift,
            rotate: p.spin,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  )
}
