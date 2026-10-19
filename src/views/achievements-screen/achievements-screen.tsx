/**
 * /achievements — Achievements showcase + level/XP progress.
 */

import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ACHIEVEMENTS } from '../../features/achievements/registry'
import { useAchievementsStore } from '../../features/achievements/achievements-store'
import { useProgressStore } from '../../features/progress/progress-store'
import { xpProgress } from '../../features/progress/xp'
import { Card } from '../../shared/ui/card'
import { PageTitle } from '../../shared/ui/heading'
import { ProgressBar } from '../../shared/ui/progress-bar'
import { cardClass } from '../../shared/ui/card-styles'
import { cx } from '../../shared/lib/cx'

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
      <PageTitle>{t('achievements.title')}</PageTitle>

      {/* Level / XP */}
      <Card className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-lg font-bold text-text">
            {t('home.level')} {progress.level}
          </span>
          <span className="text-body text-text-2">
            {xp} XP · {progress.into}/{progress.need}
          </span>
        </div>
        <ProgressBar
          value={progress.into}
          max={progress.need}
          label={t('achievements.xp_progress')}
        />
        <p className="mt-2 text-right text-caption text-text-3">
          {t('achievements.unlocked_count', {
            unlocked: unlockedCount,
            total: ACHIEVEMENTS.length,
          })}
        </p>
      </Card>

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
              className={cardClass(
                'tile',
                'md',
                cx('flex items-start gap-3', !date && 'opacity-50 grayscale'),
              )}
            >
              <span aria-hidden="true" className="text-3xl">
                {date ? a.icon : '🔒'}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-text">{t(a.titleKey)}</p>
                <p className="text-body text-text-2">{t(a.descriptionKey)}</p>
                <p className="mt-1 text-caption text-text-3">
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
          className="text-body font-semibold text-primary hover:underline"
        >
          {t('app.nav.stats')} →
        </Link>
      </div>
    </div>
  )
}
