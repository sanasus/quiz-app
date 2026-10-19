/**
 * /stats — Statistics screen: totals, breakdowns, history, chart.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buttonClass } from '../../shared/ui/button-styles'
import { Button } from '../../shared/ui/button'
import { Link } from '@tanstack/react-router'
import { useStatsStore } from '../../features/stats/stats-store'
import {
  averageStreak,
  bucketAccuracy,
  HISTORY_LIMIT,
  overallAccuracy,
} from '../../features/stats/stats-logic'
import { useProgressStore } from '../../features/progress/progress-store'
import { useAchievementsStore } from '../../features/achievements/achievements-store'
import { xpProgress } from '../../features/progress/xp'
import { ConfirmDialog } from '../../shared/ui/confirm-dialog'
import { Card } from '../../shared/ui/card'
import { Chip } from '../../shared/ui/chip'
import { PageTitle, SectionTitle } from '../../shared/ui/heading'
import { StatTile } from '../../shared/ui/stat-tile'
import { ProgressBar } from '../../shared/ui/progress-bar'

/**
 * Rough number of history rows that fit without scrolling; beyond this
 * the list becomes a focusable scroll container.
 */
const HISTORY_VISIBLE_ROWS = 10

/**
 * Lightweight accuracy-dynamics chart: a polyline over the last
 * sessions, plain SVG, no charting library.
 */
function AccuracyChart({
  history,
}: {
  history: { accuracy: number; finishedAt: number }[]
}) {
  const { t } = useTranslation()
  // History is newest-first; chart reads left-to-right (oldest first).
  const points = [...history].reverse().slice(-HISTORY_LIMIT)
  if (points.length < 2) return null

  const W = 300
  const H = 100
  const step = W / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = i * step
    const y = H - (p.accuracy / 100) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <Card className="mb-6">
      <SectionTitle>{t('stats.chart_title')}</SectionTitle>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-28 w-full"
        role="img"
        aria-label={t('stats.chart_title')}
        preserveAspectRatio="none"
      >
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-caption text-text-3">
        <span>{t('stats.chart_oldest')}</span>
        <span>{t('stats.chart_latest')}</span>
      </div>
    </Card>
  )
}

export function StatsScreen() {
  const { t, i18n } = useTranslation()
  const [confirmReset, setConfirmReset] = useState(false)

  const stats = useStatsStore()
  const resetStats = useStatsStore((s) => s.resetStats)
  const resetProgress = useProgressStore((s) => s.resetProgress)
  const resetAchievements = useAchievementsStore((s) => s.resetAchievements)
  const xp = useProgressStore((s) => s.xp)

  const isEmpty = stats.totalSessions === 0
  const progress = xpProgress(xp)

  const formatDate = (iso: string): string =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
      new Date(`${iso}T12:00:00`),
    )

  const formatSessionDate = (timestamp: number): string =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(timestamp))

  const handleReset = () => {
    resetStats()
    resetProgress()
    resetAchievements()
    setConfirmReset(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle>{t('stats.title')}</PageTitle>

      {isEmpty ? (
        <Card padding="xl" className="text-center">
          <p className="mb-4 text-text-2">{t('stats.empty')}</p>
          <Link
            to="/setup"
            className={buttonClass('primary', 'md', 'inline-flex')}
          >
            {t('home.start')}
          </Link>
        </Card>
      ) : (
        <>
          {/* Totals */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
              label={t('stats.total_sessions')}
              valueTestId="stats-sessions"
            >
              {stats.totalSessions}
            </StatTile>
            <StatTile
              label={t('stats.accuracy')}
              tone="text-primary"
              valueTestId="stats-accuracy"
            >
              {overallAccuracy(stats)}%
            </StatTile>
            <StatTile label={t('stats.avg_streak')} tone="text-success">
              {averageStreak(stats)}
            </StatTile>
            <StatTile
              label={t('stats.best_score')}
              tone="text-warning-text"
              valueTestId="stats-best-score"
            >
              {stats.bestScore}
            </StatTile>
          </div>

          {/* Level / XP */}
          <Card className="mb-6">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-semibold text-text">
                {t('home.level')} {progress.level}
              </span>
              <span className="text-body text-text-2">
                {xp} {t('stats.xp_unit')}
              </span>
            </div>
            <ProgressBar
              value={progress.into}
              max={progress.need}
              label={t('stats.xp_progress')}
            />
          </Card>

          <AccuracyChart history={stats.history} />

          {/* Accuracy by category */}
          <Card className="mb-6">
            <SectionTitle>{t('stats.by_category')}</SectionTitle>
            <ul className="flex flex-col gap-2">
              {Object.entries(stats.byCategory).map(([name, bucket]) => (
                <li
                  key={name}
                  className="flex items-center justify-between text-body"
                >
                  <span className="text-text">{name}</span>
                  <span className="text-text-2">
                    {bucket.correct}/{bucket.total} ·{' '}
                    <span className="font-semibold text-text">
                      {bucketAccuracy(bucket)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Accuracy by difficulty */}
          <Card className="mb-6">
            <SectionTitle>{t('stats.by_difficulty')}</SectionTitle>
            <ul className="flex flex-col gap-2">
              {Object.entries(stats.byDifficulty).map(([name, bucket]) => (
                <li
                  key={name}
                  className="flex items-center justify-between text-body"
                >
                  <span className="text-text">{t(`setup.${name}`, name)}</span>
                  <span className="text-text-2">
                    {bucket.correct}/{bucket.total} ·{' '}
                    <span className="font-semibold text-text">
                      {bucketAccuracy(bucket)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* History — scrollable when the list gets long */}
          <Card className="mb-6">
            <SectionTitle id="history-heading">
              {t('stats.history')}
            </SectionTitle>
            <ul
              aria-labelledby="history-heading"
              tabIndex={stats.history.length > HISTORY_VISIBLE_ROWS ? 0 : -1}
              className="flex max-h-72 flex-col gap-2 overflow-y-auto overscroll-contain"
            >
              {stats.history.map((s) => (
                <li
                  key={s.finishedAt}
                  className="flex items-center justify-between text-body"
                >
                  <span className="text-text-2">
                    {formatSessionDate(s.finishedAt)}
                  </span>
                  <span className="text-text-2">
                    {t(`setup.${s.mode}`, s.mode)} · {s.category} ·{' '}
                    {s.correctCount}/{s.totalQuestions} ·{' '}
                    <span className="font-semibold text-text">{s.score}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Play days */}
          {stats.playDays.length > 0 && (
            <Card className="mb-6">
              <SectionTitle>{t('stats.play_days')}</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {[...stats.playDays]
                  .reverse()
                  .slice(0, 14)
                  .map((day) => (
                    <Chip key={day}>{formatDate(day)}</Chip>
                  ))}
              </div>
            </Card>
          )}

          {/* Reset */}
          <div className="text-center">
            <Button variant="danger-soft" onClick={() => setConfirmReset(true)}>
              {t('stats.reset')}
            </Button>
          </div>

          <ConfirmDialog
            open={confirmReset}
            title={t('stats.reset')}
            message={t('stats.reset_confirm')}
            onConfirm={handleReset}
            onCancel={() => setConfirmReset(false)}
          />
        </>
      )}
    </div>
  )
}
