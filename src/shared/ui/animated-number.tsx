/**
 * AnimatedNumber — counts up to `value` when it changes (and, when
 * `from` is given, once on mount).
 *
 * Renders the final value as text, so tests and screen readers always
 * see the real number. Motion is skipped entirely when the user turned
 * animations off or the OS asks for reduced motion.
 */

import { useEffect, useRef, useState } from 'react'
import { useMotionEnabled } from '../lib/use-motion-enabled'

export interface AnimatedNumberProps {
  value: number
  /** Value to count from on mount (defaults to `value` = no intro). */
  from?: number
  /** Animation duration in ms. */
  duration?: number
  className?: string
  /** Prefix rendered before the number (e.g. '+'). */
  prefix?: string
  testId?: string
}

export function AnimatedNumber({
  value,
  from,
  duration = 700,
  className,
  prefix,
  testId,
}: AnimatedNumberProps) {
  const motionEnabled = useMotionEnabled()
  const [display, setDisplay] = useState(from ?? value)
  const fromRef = useRef(from ?? value)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!motionEnabled || fromRef.current === value) {
      fromRef.current = value
      setDisplay(value)
      return
    }

    const start = fromRef.current
    const startTime = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(start + (value - start) * eased))
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration, motionEnabled])

  return (
    <span data-testid={testId} className={className}>
      {prefix}
      {display}
    </span>
  )
}
