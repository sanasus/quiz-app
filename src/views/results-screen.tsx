/**
 * /results — Session results with score, accuracy, and repeat-mistakes.
 */

import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '../shared/ui/button'
import { useQuizSessionStore } from '../shared/lib/session-store'
import { useSessionMetrics } from '../features/meta/use-session-metrics'
import {
  AchievementToast,
  type AchievementToastItem,
} from '../shared/ui/achievement-toast'
import { AnimatedNumber } from '../shared/ui/animated-number'
import { Confetti } from '../shared/ui/confetti'

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

  const handleRepeatMistakes = () => {
    store.repeatMistakes(store.config)
    navigate({
      to: '/quiz',
      search: {
        category: store.config.category,
        difficulty: store.config.difficulty,
        questionCount: store.config.questionCount,
        mode: store.config.mode,
      },
    })
  }

  const handleNewQuiz = () => {
    store.reset()
    navigate({ to: '/setup' })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Celebration burst for a strong result */}
      <Confetti show={accuracy >= CONFETTI_THRESHOLD} />

      {/* Title */}
      <h1 className="mb-6 text-center text-3xl font-bold text-text">
        {t('results.title')}
      </h1>

      {/* Score card */}
      <div className="mb-6 rounded-card bg-surface p-6 text-center shadow-card">
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
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-tile bg-surface p-4 text-center shadow-sm">
          <div
            data-testid="result-correct"
            className="text-2xl font-bold text-success"
          >
            <AnimatedNumber
              value={result.correctCount}
              from={0}
              className="tabular-nums"
            />
          </div>
          <div className="text-xs text-text-2">{t('results.correct')}</div>
        </div>
        <div className="rounded-tile bg-surface p-4 text-center shadow-sm">
          <div
            data-testid="result-incorrect"
            className="text-2xl font-bold text-danger"
          >
            <AnimatedNumber
              value={result.incorrectCount}
              from={0}
              className="tabular-nums"
            />
          </div>
          <div className="text-xs text-text-2">{t('results.incorrect')}</div>
        </div>
        <div className="rounded-tile bg-surface p-4 text-center shadow-sm">
          <div
            data-testid="result-accuracy"
            className="text-2xl font-bold text-text"
          >
            <AnimatedNumber
              value={accuracy}
              from={0}
              className="tabular-nums"
            />
            %
          </div>
          <div className="text-xs text-text-2">{t('results.accuracy')}</div>
        </div>
        <div className="rounded-tile bg-surface p-4 text-center shadow-sm">
          <div
            data-testid="result-time"
            className="text-2xl font-bold text-text"
          >
            {formatTime(result.timeSpent)}
          </div>
          <div className="text-xs text-text-2">{t('results.time_spent')}</div>
        </div>
      </div>

      {/* Mistakes list */}
      {result.mistakes.length > 0 && (
        <div className="mb-6 rounded-card bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-lg font-semibold text-text">
            {t('results.mistakes_title')}
          </h2>
          <div className="flex flex-col gap-3">
            {result.mistakes.map((m, idx) => (
              <div key={idx} className="rounded-lg bg-muted p-3">
                <p className="mb-1 font-medium text-text">{m.question.text}</p>
                <div className="flex flex-col gap-1 text-sm">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {result.mistakes.length > 0 && (
          <Button variant="secondary" onClick={handleRepeatMistakes}>
            {t('results.repeat_mistakes')}
          </Button>
        )}
        <Button onClick={handleNewQuiz}>{t('results.new_quiz')}</Button>
      </div>

      {/* Achievement unlock toasts */}
      <AchievementToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
