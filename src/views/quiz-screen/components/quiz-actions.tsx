import { memo } from 'react'
import { useTranslation } from 'react-i18next'

export interface QuizActionsProps {
  streak: number
  status: string
  hasSelection: boolean
  onSkip: () => void
  onSubmit: () => void
  onNext: () => void
}

export const QuizActions = memo(function QuizActions({
  streak,
  status,
  hasSelection,
  onSkip,
  onSubmit,
  onNext,
}: QuizActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-3">
          {t('quiz.streak')}: {streak} 🔥
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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {t('quiz.submit')}
            </button>
          </>
        ) : null}
        {status === 'answered' ? (
          <button
            onClick={onNext}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {t('quiz.next')}
          </button>
        ) : null}
      </div>
    </div>
  )
})
