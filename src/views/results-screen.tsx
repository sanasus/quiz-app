/**
 * /results — Session results with score, accuracy, and the list of mistakes.
 */

import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Share2 } from 'lucide-react'
import { Button } from '../shared/ui/button'
import { useQuizSessionStore } from '../shared/lib/session-store'
import { useSessionMetrics } from '../features/meta/use-session-metrics'
import {
  AchievementToast,
  type AchievementToastItem,
} from '../shared/ui/achievement-toast'
import { AnimatedNumber } from '../shared/ui/animated-number'
import { Confetti } from '../shared/ui/confetti'
import { Card } from '../shared/ui/card'
import { PageTitle, SectionTitle } from '../shared/ui/heading'
import { StatTile } from '../shared/ui/stat-tile'
import { AppToast } from '../shared/ui/app-toast'
import { useProgressStore } from '../features/progress/progress-store'
import { levelFromXp } from '../features/progress/xp'
import { useStatsStore } from '../features/stats/stats-store'
import { useShareCard } from '../features/share/use-share-card'
import type { ShareOutcome } from '../features/share/share-result'

const SHARE_TOAST_KEYS: Record<Exclude<ShareOutcome, 'cancelled'>, string> = {
  shared: 'share.shared',
  'copied-image': 'share.copied',
  downloaded: 'share.downloaded',
}

/** Accuracy (%) at or above which the win confetti fires. */
const CONFETTI_THRESHOLD = 70

export function ResultsScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = useQuizSessionStore()

  // Fold the finished session into stats/achievements/XP exactly once.
  const metrics = useSessionMetrics()

  // Toast queue: starts from what the metrics hook unlocked; items are
  // removed as they are dismissed (or auto-expire in the toast itself).
  const [dismissed, setDismissed] = useState<string[]>([])
  const toasts: AchievementToastItem[] = (metrics?.newAchievements ?? [])
    .filter((a) => !dismissed.includes(a.id))
    .map((a) => ({ ...a, toastKey: a.id }))

  const dismissToast = useCallback((toastKey: string) => {
    setDismissed((prev) => [...prev, toastKey])
  }, [])

  // After a reload the session is restored but already folded into stats,
  // so `metrics` stays null: rebuild what the card needs from the stores.
  const xp = useProgressStore((s) => s.xp)
  const recorded = useStatsStore(
    (s) => s.history[0]?.finishedAt === store.finishedSession?.finishedAt,
  )
  const shareMetrics =
    metrics ??
    (recorded ? { level: levelFromXp(xp), isNewRecord: false } : null)
  const shareCard = useShareCard(store.finishedSession, shareMetrics)
  const [shareToast, setShareToast] = useState<string | null>(null)
  const dismissShareToast = useCallback(() => setShareToast(null), [])

  // The route's beforeLoad guard redirects to /setup without a finished
  // session; this is only a render-time safety net.
  if (store.status !== 'finished') return null

  const result = store.finishedSession
  if (!result) return null

  const accuracy =
    result.totalQuestions > 0
      ? Math.round((result.correctCount / result.totalQuestions) * 100)
      : 0

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleNewQuiz = () => {
    store.reset()
    navigate({ to: '/setup' })
  }

  // Called straight from the click: the PNG is already rendered, so
  // `share()` runs inside the user activation Safari requires.
  const handleShare = async () => {
    try {
      const outcome = await shareCard.share()
      if (outcome === null || outcome === 'cancelled') return
      setShareToast(t(SHARE_TOAST_KEYS[outcome]))
    } catch {
      setShareToast(t('share.failed'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Celebration burst for a strong result */}
      <Confetti show={accuracy >= CONFETTI_THRESHOLD} />

      {/* Title */}
      <PageTitle>{t('results.title')}</PageTitle>

      {/* Score card */}
      <Card padding="lg" className="mb-6 text-center">
        <div
          data-testid="result-score"
          className="mb-2 text-5xl font-extrabold text-primary"
        >
          <AnimatedNumber
            value={result.score}
            from={0}
            className="tabular-nums"
          />
        </div>
        <div className="text-text-2">{t('results.score')}</div>
        {metrics && (
          <div
            data-testid="result-xp"
            className="mt-2 text-lg font-bold text-warning-text"
          >
            +{metrics.xpGained} XP
          </div>
        )}
      </Card>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label={t('results.correct')}
          tone="text-success"
          valueTestId="result-correct"
        >
          <AnimatedNumber
            value={result.correctCount}
            from={0}
            className="tabular-nums"
          />
        </StatTile>
        <StatTile
          label={t('results.incorrect')}
          tone="text-danger"
          valueTestId="result-incorrect"
        >
          <AnimatedNumber
            value={result.incorrectCount}
            from={0}
            className="tabular-nums"
          />
        </StatTile>
        <StatTile label={t('results.accuracy')} valueTestId="result-accuracy">
          <AnimatedNumber value={accuracy} from={0} className="tabular-nums" />%
        </StatTile>
        <StatTile label={t('results.time_spent')} valueTestId="result-time">
          {formatTime(result.timeSpent)}
        </StatTile>
      </div>

      {/* Mistakes list */}
      {result.mistakes.length > 0 && (
        <Card className="mb-6">
          <SectionTitle>{t('results.mistakes_title')}</SectionTitle>
          <div className="flex flex-col gap-3">
            {result.mistakes.map((m, idx) => (
              <Card key={idx} variant="inset" padding="sm">
                <p className="mb-1 font-medium text-text">{m.question.text}</p>
                <div className="flex flex-col gap-1 text-body">
                  <span className="text-danger-ink">
                    ❌{' '}
                    {m.selectedOptionIds
                      .map(
                        (id) =>
                          m.question.options.find((o) => o.id === id)?.text ??
                          id,
                      )
                      .join(', ')}
                  </span>
                  <span className="text-success-ink">
                    ✅{' '}
                    {m.question.correctOptionIds
                      .map(
                        (id) =>
                          m.question.options.find((o) => o.id === id)?.text ??
                          id,
                      )
                      .join(', ')}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={handleNewQuiz}>{t('results.new_quiz')}</Button>
        {!shareCard.failed && (
          <Button
            variant="secondary"
            onClick={handleShare}
            disabled={!shareCard.ready}
          >
            <Share2 className="size-4" aria-hidden />
            {shareCard.ready ? t('share.button') : t('share.preparing')}
          </Button>
        )}
      </div>

      {shareToast && (
        <AppToast
          message={shareToast}
          position="bottom"
          onDismiss={dismissShareToast}
        />
      )}

      {/* Achievement unlock toasts */}
      <AchievementToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
