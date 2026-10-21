import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/ui/button'

/** Pause after a right answer — a quick confirmation. */
export const NEXT_DELAY_CORRECT_MS = 1500
/** Pause after a wrong answer — time to read the right one. */
export const NEXT_DELAY_INCORRECT_MS = 3500

const RING_RADIUS = 9
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

export interface NextCountdownProps {
  /** How long the pill counts down before moving on. */
  delayMs: number
  /** The next question batch is loading: no countdown until it arrives. */
  blocked?: boolean
  onNext: () => void
}

/**
 * Pill that counts down to the next question and, pressed, skips the wait.
 * Owns the timer: moves on by itself when the ring runs out. The ring is
 * one CSS animation (no per-tick state), the digit follows the wall clock.
 */
export const NextCountdown = memo(function NextCountdown(
  props: NextCountdownProps,
) {
  // Keyed by `blocked`: coming back from «loading next» remounts the pill,
  // so the digit starts from the full delay instead of the number left over
  // from before the wait (no state reset inside an effect needed).
  return <Countdown key={props.blocked ? 'blocked' : 'running'} {...props} />
})

function Countdown({ delayMs, blocked = false, onNext }: NextCountdownProps) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(delayMs / 1000))

  useEffect(() => {
    if (blocked) return
    const startedAt = Date.now()
    const tick = window.setInterval(() => {
      const left = Math.ceil((delayMs - (Date.now() - startedAt)) / 1000)
      setSecondsLeft(Math.max(1, left))
    }, 200)
    const done = window.setTimeout(onNext, delayMs)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(done)
    }
  }, [blocked, delayMs, onNext])

  return (
    <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] mt-6 flex justify-center">
      <Button
        variant="secondary"
        size="sm"
        className="gap-2 rounded-pill pl-2"
        onClick={onNext}
        disabled={blocked}
        data-testid="next-countdown"
      >
        <span className="relative size-6 shrink-0" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-6 -rotate-90">
            <circle
              cx="12"
              cy="12"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="2.5"
              className="stroke-border"
            />
            {blocked ? null : (
              <circle
                cx="12"
                cy="12"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="next-ring stroke-primary"
                style={{
                  strokeDasharray: RING_LENGTH,
                  ['--ring-length' as string]: RING_LENGTH,
                  animationDuration: `${delayMs}ms`,
                }}
              />
            )}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-text">
            {blocked ? '' : secondsLeft}
          </span>
        </span>
        {blocked ? t('quiz.loading_next') : t('quiz.next')}
      </Button>
    </div>
  )
}
