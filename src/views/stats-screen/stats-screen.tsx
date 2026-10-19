/**
 * /stats — Statistics screen: totals, breakdowns, history, chart.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buttonClass } from '../../shared/ui/button-styles'
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
    <div className="mb-6 rounded-xl bg-surface p-4 shadow-md">
      <h2 className="mb-3 text-lg font-semibold text-text">
        {t('stats.chart_title')}
      </h2>
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
      <div className="mt-1 flex justify-between text-xs text-text-3">
        <span>{t('stats.chart_oldest')}</span>
        <span>{t('stats.chart_latest')}</span>
      </div>
    </div>
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
      <h1 className="mb-6 text-center text-3xl font-bold text-text">
        {t('stats.title')}
      </h1>

      {isEmpty ? (
        <div className="rounded-xl bg-surface p-8 text-center shadow-md">
          <p className="mb-4 text-text-2">{t('stats.empty')}</p>
          <Link
            to="/setup"
            className={buttonClass('primary', 'md', 'inline-flex')}
          >
            {t('home.start')}
          </Link>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-surface p-4 text-center shadow-sm">
              <div
                data-testid="stats-sessions"
                className="text-2xl font-bold text-text"
              >
                {stats.totalSessions}
              </div>
              <div className="text-xs text-text-2">
                {t('stats.total_sessions')}
              </div>
            </div>
            <div className="rounded-xl bg-surface p-4 text-center shadow-sm">
              <div
                data-testid="stats-accuracy"
                className="text-2xl font-bold text-primary"
              >
                {overallAccuracy(stats)}%
              </div>
              <div className="text-xs text-text-2">{t('stats.accuracy')}</div>
            </div>
            <div className="rounded-xl bg-surface p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-success">
                {averageStreak(stats)}
              </div>
              <div className="text-xs text-text-2">{t('stats.avg_streak')}</div>
            </div>
            <div className="rounded-xl bg-surface p-4 text-center shadow-sm">
              <div
                data-testid="stats-best-score"
                className="text-2xl font-bold text-warning-text"
              >
                {stats.bestScore}
              </div>
              <div className="text-xs text-text-2">{t('stats.best_score')}</div>
            </div>
          </div>

          {/* Level / XP */}
          <div className="mb-6 rounded-xl bg-surface p-4 shadow-md">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-semibold text-text">
                {t('home.level')} {progress.level}
              </span>
              <span className="text-sm text-text-2">
                {xp} {t('stats.xp_unit')}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.need}
              aria-valuenow={progress.into}
              aria-label={t('stats.xp_progress')}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${Math.min(100, (progress.into / progress.need) * 100)}%`,
                }}
              />
            </div>
          </div>

          <AccuracyChart history={stats.history} />

          {/* Accuracy by category */}
          <div className="mb-6 rounded-xl bg-surface p-4 shadow-md">
            <h2 className="mb-3 text-lg font-semibold text-text">
              {t('stats.by_category')}
            </h2>
            <ul className="flex flex-col gap-2">
              {Object.entries(stats.byCategory).map(([name, bucket]) => (
                <li
                  key={name}
                  className="flex items-center justify-between text-sm"
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
          </div>

          {/* Accuracy by difficulty */}
          <div className="mb-6 rounded-xl bg-surface p-4 shadow-md">
            <h2 className="mb-3 text-lg font-semibold text-text">
              {t('stats.by_difficulty')}
            </h2>
            <ul className="flex flex-col gap-2">
              {Object.entries(stats.byDifficulty).map(([name, bucket]) => (
                <li
                  key={name}
                  className="flex items-center justify-between text-sm"
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
          </div>

          {/* History — scrollable when the list gets long */}
          <div className="mb-6 rounded-xl bg-surface p-4 shadow-md">
            <h2
              id="history-heading"
              className="mb-3 text-lg font-semibold text-text"
            >
              {t('stats.history')}
            </h2>
            <ul
              aria-labelledby="history-heading"
              tabIndex={stats.history.length > HISTORY_VISIBLE_ROWS ? 0 : -1}
              className="flex max-h-72 flex-col gap-2 overflow-y-auto overscroll-contain"
            >
              {stats.history.map((s) => (
                <li
                  key={s.finishedAt}
                  className="flex items-center justify-between text-sm"
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
          </div>

          {/* Play days */}
          {stats.playDays.length > 0 && (
            <div className="mb-6 rounded-xl bg-surface p-4 shadow-md">
              <h2 className="mb-3 text-lg font-semibold text-text">
                {t('stats.play_days')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {[...stats.playDays]
                  .reverse()
                  .slice(0, 14)
                  .map((day) => (
                    <span
                      key={day}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-text-2"
                    >
                      {formatDate(day)}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Reset */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="rounded-lg border-2 border-danger px-6 py-2.5 font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              {t('stats.reset')}
            </button>
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
