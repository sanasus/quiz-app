/**
 * /results — Session results with score, accuracy, and repeat-mistakes.
 */

import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuizSessionStore } from '../shared/lib/session-store'

export const ResultsScreen = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = useQuizSessionStore()

  // Guard: no finished session → redirect to setup
  useEffect(() => {
    if (store.status !== 'finished') {
      navigate({ to: '/setup', replace: true })
    }
  }, [store.status, navigate])

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
    navigate({ to: '/quiz' })
  }

  const handleNewQuiz = () => {
    store.reset()
    navigate({ to: '/setup' })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Title */}
      <h1 className="mb-6 text-center text-3xl font-bold text-text">
        {t('results.title')}
      </h1>

      {/* Score card */}
      <div className="mb-6 rounded-xl bg-surface p-6 text-center shadow-md">
        <div className="mb-2 text-5xl font-extrabold text-primary">
          {result.score}
        </div>
        <div className="text-text-2">{t('results.score')}</div>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-surface p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-success">{result.correctCount}</div>
          <div className="text-xs text-text-2">{t('results.correct')}</div>
        </div>
        <div className="rounded-xl bg-surface p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-danger">{result.incorrectCount}</div>
          <div className="text-xs text-text-2">{t('results.incorrect')}</div>
        </div>
        <div className="rounded-xl bg-surface p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-text">{accuracy}%</div>
          <div className="text-xs text-text-2">{t('results.accuracy')}</div>
        </div>
        <div className="rounded-xl bg-surface p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-text">{formatTime(result.timeSpent)}</div>
          <div className="text-xs text-text-2">{t('results.time_spent')}</div>
        </div>
      </div>

      {/* Mistakes list */}
      {result.mistakes.length > 0 && (
        <div className="mb-6 rounded-xl bg-surface p-4 shadow-md">
          <h2 className="mb-3 text-lg font-semibold text-text">
            {t('results.mistakes_title')}
          </h2>
          <div className="flex flex-col gap-3">
            {result.mistakes.map((m, idx) => (
              <div key={idx} className="rounded-lg bg-muted p-3">
                <p className="mb-1 font-medium text-text">{m.question.text}</p>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-danger">
                    ❌ {m.selectedOptionIds.map((id) => m.question.options.find((o) => o.id === id)?.text ?? id).join(', ')}
                  </span>
                  <span className="text-success">
                    ✅ {m.question.correctOptionIds.map((id) => m.question.options.find((o) => o.id === id)?.text ?? id).join(', ')}
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
          <button
            type="button"
            onClick={handleRepeatMistakes}
            className="rounded-lg border-2 border-primary px-6 py-2.5 font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {t('results.repeat_mistakes')}
          </button>
        )}
        <button
          type="button"
          onClick={handleNewQuiz}
          className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          {t('results.new_quiz')}
        </button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/results')({
  component: ResultsScreen,
})
