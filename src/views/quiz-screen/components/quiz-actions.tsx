import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatedNumber } from '../../../shared/ui/animated-number'

export interface QuizActionsProps {
  streak: number
  status: string
  hasSelection: boolean
  /** The next question batch is loading — Next waits for it. */
  nextDisabled?: boolean
  onSkip: () => void
  onSubmit: () => void
  onNext: () => void
}

export const QuizActions = memo(function QuizActions({
  streak,
  status,
  hasSelection,
  nextDisabled = false,
  onSkip,
  onSubmit,
  onNext,
}: QuizActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-3">
          {t('quiz.streak')}:{' '}
          <AnimatedNumber
            value={streak}
            duration={400}
            className="tabular-nums"
          />{' '}
          🔥
        </span>
      </div>
      <div className="flex gap-3">
        {status !== 'answered' ? (
          <>
            <button
              onClick={onSkip}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:bg-muted"
            >
              {t('quiz.skip')}
            </button>
            <button
              onClick={onSubmit}
              disabled={!hasSelection}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {t('quiz.submit')}
            </button>
          </>
        ) : null}
        {status === 'answered' ? (
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
          >
            {nextDisabled ? t('quiz.loading_next') : t('quiz.next')}
          </button>
        ) : null}
      </div>
    </div>
  )
})
