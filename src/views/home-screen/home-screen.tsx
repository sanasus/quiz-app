/**
 * / — Home screen: hero with the start action, level ring, streak and
 * session stats, repeat-last-settings shortcut, last session result.
 */

import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { buttonClass } from '../../shared/ui/button-styles'
import { Card } from '../../shared/ui/card'
import { ProgressRing } from '../../shared/ui/progress-ring'
import { StatTile } from '../../shared/ui/stat-tile'
import { useProgressStore } from '../../features/progress/progress-store'
import { useStatsStore } from '../../features/stats/stats-store'
import { useProviderStore } from '../../shared/api/provider-store'
import { xpProgress } from '../../features/progress/xp'

export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const xp = useProgressStore((s) => s.xp)
  const history = useStatsStore((s) => s.history)
  const providerId = useProviderStore((s) => s.providerId)
  const bestStreak = useStatsStore((s) => s.bestStreak)
  const totalSessions = useStatsStore((s) => s.totalSessions)

  const progress = xpProgress(xp)
  const last = history[0]

  const formatSessionDate = (timestamp: number): string =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(timestamp))

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-10 animate-fade-in">
      <h1 className="px-2 text-center text-3xl font-bold text-primary-ink sm:text-4xl">
        {t('home.welcome')}
      </h1>

      {/* Primary action */}
      <div className="flex flex-col items-center gap-3">
        <Link to="/setup" className={buttonClass('primary', 'lg')}>
          {t('home.start')}
        </Link>
        {/* Category slugs differ per provider: only offer the shortcut when
            the last session ran on the active one. */}
        {last && last.providerId === providerId ? (
          <Link
            to="/quiz"
            search={{
              category: last.category,
              difficulty: last.difficulty,
              questionCount: Math.min(50, Math.max(1, last.totalQuestions)),
              mode: last.mode,
            }}
            className={buttonClass('secondary', 'sm')}
          >
            {t('home.repeat_last')} · {t(`setup.${last.mode}`)} ·{' '}
            {t(`setup.${last.difficulty}`)}
          </Link>
        ) : null}
      </div>

      {/* Level / XP */}
      <Card
        className="flex w-full items-center gap-5"
        data-testid="home-level"
        padding="lg"
      >
        <ProgressRing
          value={progress.into}
          max={progress.need}
          label={t('home.xp_progress')}
        >
          <span className="text-xs uppercase tracking-wide text-text-3">
            {t('home.level')}
          </span>
          <span className="text-3xl font-bold leading-none text-text">
            {progress.level}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="text-lg font-bold text-text">{xp} XP</p>
          <p className="text-sm text-text-2">
            {progress.into}/{progress.need}
          </p>
        </div>
      </Card>

      {/* Streak and sessions */}
      <div className="grid w-full grid-cols-2 gap-4">
        <StatTile label={t('home.best_streak')} tone="text-success">
          {bestStreak}
        </StatTile>
        <StatTile label={t('home.sessions')} tone="text-primary-ink">
          {totalSessions}
        </StatTile>
      </div>

      {/* Last session result */}
      {last ? (
        <Card className="w-full text-center" data-testid="home-last-result">
          <p className="mb-1 text-xs uppercase tracking-wide text-text-3">
            {t('home.last_results')}
          </p>
          <p className="text-2xl font-extrabold text-primary-ink">
            {last.score}
          </p>
          <p className="text-sm text-text-2">
            {last.correctCount}/{last.totalQuestions} · {last.accuracy}%
          </p>
          <p className="mt-1 text-xs text-text-3">
            {formatSessionDate(last.finishedAt)}
          </p>
        </Card>
      ) : null}
    </div>
  )
}
