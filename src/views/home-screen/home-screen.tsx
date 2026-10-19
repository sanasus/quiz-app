/**
 * / — Home screen: start button, level, last session results.
 */

import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { buttonClass } from '../../shared/ui/button-styles'
import { useProgressStore } from '../../features/progress/progress-store'
import { useStatsStore } from '../../features/stats/stats-store'
import { xpProgress } from '../../features/progress/xp'
import { Card } from '../../shared/ui/card'
import { ProgressBar } from '../../shared/ui/progress-bar'

export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const xp = useProgressStore((s) => s.xp)
  const history = useStatsStore((s) => s.history)

  const progress = xpProgress(xp)
  const last = history[0]

  const formatSessionDate = (timestamp: number): string =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(timestamp))

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 animate-fade-in">
      <h1 className="px-2 text-center text-3xl font-bold text-primary sm:text-4xl">
        {t('home.welcome')}
      </h1>

      {/* Level / XP */}
      <Card className="w-full max-w-xs" data-testid="home-level">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-bold text-text">
            {t('home.level')} {progress.level}
          </span>
          <span className="text-sm text-text-2">
            {xp} XP · {progress.into}/{progress.need}
          </span>
        </div>
        <ProgressBar
          value={progress.into}
          max={progress.need}
          label={t('home.xp_progress')}
        />
      </Card>

      {/* Last session result */}
      {last && (
        <Card
          className="w-full max-w-xs text-center"
          data-testid="home-last-result"
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-text-3">
            {t('home.last_results')}
          </p>
          <p className="text-2xl font-extrabold text-primary">{last.score}</p>
          <p className="text-sm text-text-2">
            {last.correctCount}/{last.totalQuestions} · {last.accuracy}%
          </p>
          <p className="mt-1 text-xs text-text-3">
            {formatSessionDate(last.finishedAt)}
          </p>
        </Card>
      )}

      <Link to="/setup" className={buttonClass('primary', 'lg')}>
        {t('home.start')}
      </Link>
    </div>
  )
}
