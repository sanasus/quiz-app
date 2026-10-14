import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { QuizMode } from '../../../shared/types/quiz'
import { getMode } from '../../../features/modes'
import { useMotionEnabled } from '../../../shared/lib/use-motion-enabled'
import { AnimatedNumber } from '../../../shared/ui/animated-number'

export interface QuizHeaderProps {
  progress: number
  total: number
  mode: QuizMode
  timeRemaining?: number
  /** Full timer length for the current scope (bar fill ratio). */
  timeLimit?: number | null
  lives?: number
  score: number
}

/** Seconds of remaining time at which the timer starts pulsing. */
const LOW_TIME = 10

export function QuizHeader({
  progress,
  total,
  mode,
  timeRemaining,
  timeLimit,
  lives,
  score,
}: QuizHeaderProps) {
  const { t } = useTranslation()
  const modeDef = getMode(mode)
  const motionEnabled = useMotionEnabled()

  const hasTimer = modeDef.headerType === 'timer' && timeRemaining !== undefined
  const lowTime = hasTimer && timeRemaining <= LOW_TIME
  const fill =
    hasTimer && timeLimit
      ? Math.max(0, Math.min(100, (timeRemaining / timeLimit) * 100))
      : 0

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div>
          <h2 className="text-xl font-bold text-text">
            {t('quiz.question')} {progress}/{total}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {hasTimer ? (
            <motion.span
              data-testid="quiz-timer"
              role="timer"
              aria-label={t('quiz.time_remaining')}
              className={`text-lg font-mono font-bold tabular-nums ${
                lowTime ? 'text-danger-ink' : 'text-text'
              }`}
              animate={{ scale: motionEnabled && lowTime ? [1, 1.12, 1] : 1 }}
              transition={{
                duration: 0.8,
                repeat: motionEnabled && lowTime ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              {timeRemaining}s
            </motion.span>
          ) : null}
          {modeDef.headerType === 'lives' ? (
            <span
              data-testid="quiz-lives"
              aria-label={t('quiz.lives')}
              className="text-lg"
            >
              {'❤️'.repeat(lives ?? 0)}
            </span>
          ) : null}
          <span className="text-lg font-bold text-primary-ink">
            {t('quiz.score_label')}{' '}
            <AnimatedNumber value={score} className="tabular-nums" />
          </span>
        </div>
      </div>

      {/* Timer bar — fill shrinks with the remaining time. */}
      {hasTimer && timeLimit ? (
        <div
          className="mt-3 h-2 overflow-hidden rounded-pill bg-muted"
          aria-hidden="true"
        >
          <div
            className={`h-full rounded-pill transition-[width] duration-1000 ease-linear ${
              lowTime ? 'bg-danger' : 'bg-primary'
            }`}
            style={{ width: `${fill}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}
