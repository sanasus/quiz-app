/**
 * /achievements — Achievements showcase + level/XP progress.
 */

import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ACHIEVEMENTS } from '../../features/achievements/registry'
import { useAchievementsStore } from '../../features/achievements/achievements-store'
import { useProgressStore } from '../../features/progress/progress-store'
import { xpProgress } from '../../features/progress/xp'

export function AchievementsScreen() {
  const { t, i18n } = useTranslation()
  const unlocked = useAchievementsStore((s) => s.unlocked)
  const xp = useProgressStore((s) => s.xp)

  const progress = xpProgress(xp)
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length

  const formatDate = (iso: string): string =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
      new Date(`${iso}T12:00:00`),
    )

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-text">
        {t('achievements.title')}
      </h1>

      {/* Level / XP */}
      <div className="mb-6 rounded-card bg-surface p-4 shadow-card">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-lg font-bold text-text">
            {t('home.level')} {progress.level}
          </span>
          <span className="text-sm text-text-2">
            {xp} XP · {progress.into}/{progress.need}
          </span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-bg shadow-neu-inset-sm"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.need}
          aria-valuenow={progress.into}
          aria-label={t('achievements.xp_progress')}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${Math.min(100, (progress.into / progress.need) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-text-3">
          {t('achievements.unlocked_count', {
            unlocked: unlockedCount,
            total: ACHIEVEMENTS.length,
          })}
        </p>
      </div>

      {/* Grid */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const date = unlocked[a.id]
          return (
            <li
              key={a.id}
              data-testid={`achievement-${a.id}`}
              data-unlocked={date ? 'true' : 'false'}
              aria-label={t(a.titleKey)}
              className={`flex items-start gap-3 rounded-tile bg-surface p-4 shadow-sm ${
                date ? '' : 'opacity-50 grayscale'
              }`}
            >
              <span aria-hidden="true" className="text-3xl">
                {date ? a.icon : '🔒'}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-text">{t(a.titleKey)}</p>
                <p className="text-sm text-text-2">{t(a.descriptionKey)}</p>
                <p className="mt-1 text-xs text-text-3">
                  {date
                    ? t('achievements.unlocked_on', {
                        date: formatDate(date),
                      })
                    : t('achievements.locked')}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 text-center">
        <Link
          to="/stats"
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t('app.nav.stats')} →
        </Link>
      </div>
    </div>
  )
}
