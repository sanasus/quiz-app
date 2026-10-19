import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Flame } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
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
    <Card
      variant="tile"
      padding="sm"
      className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <div className="flex items-baseline gap-2 px-1">
        <span className="text-stat text-success">
          <AnimatedNumber
            value={streak}
            duration={400}
            className="tabular-nums"
          />
        </span>
        <span className="flex items-center gap-1 text-caption text-text-2">
          {t('quiz.streak')}
          <Flame className="size-4 fill-current text-streak" aria-hidden />
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
    </Card>
  )
})
