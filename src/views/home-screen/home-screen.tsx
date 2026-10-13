/**
 * / — Home screen: start button, level, last session results.
 */

import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useProgressStore } from '../../features/progress/progress-store'
import { useStatsStore } from '../../features/stats/stats-store'
import { xpProgress } from '../../features/progress/xp'

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
        🏠 {t('home.welcome')}
      </h1>

      {/* Level / XP */}
      <div
        className="w-full max-w-xs rounded-xl bg-surface p-4 shadow-md"
        data-testid="home-level"
      >
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-bold text-text">
            {t('home.level')} {progress.level}
          </span>
          <span className="text-sm text-text-2">
            {xp} XP · {progress.into}/{progress.need}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.need}
          aria-valuenow={progress.into}
          aria-label={t('home.xp_progress')}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${Math.min(100, (progress.into / progress.need) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Last session result */}
      {last && (
        <div
          className="w-full max-w-xs rounded-xl bg-surface p-4 text-center shadow-md"
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
        </div>
      )}

      <Link
        to="/setup"
        className="rounded-lg bg-primary px-6 py-3 text-lg font-bold text-on-primary shadow-md transition-[transform,box-shadow,background-color] hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
      >
        {t('home.start')}
      </Link>
    </div>
  )
}
