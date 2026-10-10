import { useTranslation } from 'react-i18next'

export interface QuizHeaderProps {
  progress: number
  total: number
  mode: 'timed' | 'blitz' | 'survival' | 'classic'
  timeRemaining?: number
  lives?: number
  score: number
}

export function QuizHeader({
  progress,
  total,
  mode,
  timeRemaining,
  lives,
  score,
}: QuizHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-text">
          {t('quiz.question')} {progress}/{total}
        </h2>
        <p className="text-sm text-text-2">{t('quiz.progress', { current: progress, total })}</p>
      </div>
      <div className="flex items-center gap-4">
        {mode === 'timed' && timeRemaining !== undefined ? (
          <span
            className={`text-lg font-mono font-bold ${
              timeRemaining <= 10 ? 'text-red-400' : 'text-text'
            }`}
          >
            {timeRemaining}s
          </span>
        ) : null}
        {mode === 'survival' ? (
          <span className="text-lg text-red-400">
            {'❤️'.repeat(lives ?? 0)}
          </span>
        ) : null}
        <span className="text-lg font-bold text-primary">
          {t('quiz.score', { score })}
        </span>
      </div>
    </div>
  )
}
