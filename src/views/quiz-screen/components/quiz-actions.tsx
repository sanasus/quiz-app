import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/ui/button'
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
    <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-bg pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <span className="text-body text-text-3">
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
            <Button variant="ghost" size="sm" onClick={onSkip}>
              {t('quiz.skip')}
            </Button>
            <Button size="sm" onClick={onSubmit} disabled={!hasSelection}>
              {t('quiz.submit')}
            </Button>
          </>
        ) : null}
        {status === 'answered' ? (
          <Button size="sm" onClick={onNext} disabled={nextDisabled}>
            {nextDisabled ? t('quiz.loading_next') : t('quiz.next')}
          </Button>
        ) : null}
      </div>
    </div>
  )
})
