/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuizSessionStore, getBlitzTimeLimit, getTimedTimeLimit } from '../../shared/lib/session-store'
import { useQuizQuestions } from '../../shared/api/quizapi'
import { calculateScore } from '../../shared/lib/scoring'
import { quizConfigSchema } from '../-index'

// ---------------------------------------------------------------------------
// Quiz Screen Component
// ---------------------------------------------------------------------------

export function QuizScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/quiz' })
  const configResult = quizConfigSchema.safeParse(search)
  const config = configResult.success ? configResult.data : null
  const store = useQuizSessionStore()

  // Use repeatConfig from store as fallback (repeat-mistakes flow)
  const effectiveConfig = config ?? store.repeatConfig

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------

  const sessionStartTimeRef = useRef<number | null>(null)
  if (sessionStartTimeRef.current === null) {
    sessionStartTimeRef.current = Date.now()
  }

  useEffect(() => {
    if (!effectiveConfig) return

    const interval = setInterval(() => {
      if (store.getState().status !== 'playing') {
        clearInterval(interval)
        return
      }

      if (effectiveConfig.mode === 'timed') {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current!) / 1000,
        )
        const remaining = effectiveConfig.questionCount - elapsed
        if (remaining <= 0) {
          clearInterval(interval)
          store.getState().timeUp()
        } else {
          store.getState().startTimer(remaining)
        }
      } else if (effectiveConfig.mode === 'blitz') {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current!) / 1000,
        )
        const limit = getBlitzTimeLimit(effectiveConfig.questionCount)
        if (elapsed >= limit) {
          clearInterval(interval)
          store.getState().timeUp()
        } else {
          store.getState().setBlitzTimeElapsed(elapsed)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveConfig])

  // ---------------------------------------------------------------------------
  // Question timer
  // ---------------------------------------------------------------------------

  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null)
  const [currentSubmission, setCurrentSubmission] = useState<string[]>([])

  useEffect(() => {
    if (store.status !== 'playing') return

    const currentQuestion = store.questions[store.currentIndex]
    if (!currentQuestion) return

    const limit = store.timeRemaining
    if (!limit) return

    // Derive time from state during render, not in effect
    setQuestionTimeLeft(limit)

    const interval = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev === null) return prev
        const next = prev - 1
        if (next <= 0) {
          clearInterval(interval)
          store.getState().timeUp()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.status, store.questions, store.currentIndex, store.timeRemaining])

  // ---------------------------------------------------------------------------
  // Load questions when config is valid
  // ---------------------------------------------------------------------------

  const { data: questions, error } = useQuizQuestions(effectiveConfig)

  const prevConfigRef = useRef<string | null>(null)

  useEffect(() => {
    if (!questions || !effectiveConfig) return

    // Skip loading if we're in a repeat session (questions already loaded)
    if (store.questions.length > 0) return

    // Detect config changes via ref to avoid stale query cache issues
    const configKey = `${effectiveConfig.category}-${effectiveConfig.difficulty}-${effectiveConfig.questionCount}-${effectiveConfig.mode}`
    if (prevConfigRef.current === configKey) return
    prevConfigRef.current = configKey

    sessionStartTimeRef.current = Date.now()
    store.getState().reset()
    store.getState().loadQuestions(questions, effectiveConfig)

    // Initialize timer based on mode
    if (effectiveConfig.mode === 'timed') {
      const timeLimit = getTimedTimeLimit(effectiveConfig.questionCount)
      store.getState().startTimer(timeLimit)
    } else if (effectiveConfig.mode === 'blitz') {
      const timeLimit = getBlitzTimeLimit(effectiveConfig.questionCount)
      store.getState().startTimer(timeLimit)
    }

    store.getState().startPlaying()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, effectiveConfig, store.questions.length])

  const currentQuestion = store.questions[store.currentIndex]

  // ---------------------------------------------------------------------------
  // Submit / Skip / Next handlers
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(() => {
    if (!currentQuestion) return
    const selectedOptionIds = currentSubmission.filter((id) => id !== '')
    store.selectOption(currentQuestion.id, selectedOptionIds)
  }, [currentQuestion, currentSubmission, store])

  const handleSkip = useCallback(() => {
    if (!currentQuestion) return
    store.skipQuestion(currentQuestion.id)
  }, [currentQuestion, store])

  const handleNext = useCallback(() => {
    if (!currentQuestion) return
    store.advance()
  }, [currentQuestion, store])

  // ---------------------------------------------------------------------------
  // Session end detection
  // ---------------------------------------------------------------------------

  const sessionEndDeps = `${store.status}-${store.currentIndex}-${store.questions.length}-${store.score}`

  useEffect(() => {
    const isFinished = store.status === 'finished'
    const isAllAnswered =
      store.status === 'answered' &&
      store.currentIndex >= store.questions.length - 1

    if (isFinished || isAllAnswered) {
      store.finishSession(
        currentQuestion?.id,
        calculateScore(
          currentQuestion,
          store.answers[currentQuestion?.id ?? ''],
          store.config.difficulty,
          questionTimeLeft,
          store.timeSpent,
        ),
        store.correctCount,
      )
      navigate({ to: '/results' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEndDeps, navigate, config])

  if (!effectiveConfig) {
    navigate({ to: '/setup' })
    return null
  }

  if (store.status === 'idle' || store.status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-text-2">{t('common.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-red-400">{t('common.error')}: {error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-white"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-text-2">{t('common.loading')}</div>
      </div>
    )
  }

  const progress = store.currentIndex + 1
  const total = store.questions.length

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">
            {t('quiz.question')} {progress}/{total}
          </h2>
          <p className="text-sm text-text-2">{t('quiz.progress', { current: progress, total })}</p>
        </div>
        <div className="flex items-center gap-4">
          {store.mode === 'timed' && store.timeRemaining !== undefined && (
            <span
              className={`text-lg font-mono font-bold ${
                store.timeRemaining <= 10 ? 'text-red-400' : 'text-text'
              }`}
            >
              {store.timeRemaining}s
            </span>
          )}
          {store.mode === 'survival' && (
            <span className="text-lg text-red-400">
              {'❤️'.repeat(store.lives)}
            </span>
          )}
          <span className="text-lg font-bold text-primary">
            {t('quiz.score', { score: store.score })}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-text">
          {currentQuestion.text}
        </h3>
        {currentQuestion.description && (
          <p className="mb-4 text-sm text-text-2">{currentQuestion.description}</p>
        )}

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = currentSubmission.includes(option.id)
            const isCorrect = currentQuestion.correctOptionIds.includes(option.id)
            const showResult = store.status === 'answered'

            let optionClass = 'border-border bg-bg text-text'
            if (showResult) {
              if (isCorrect) {
                optionClass = 'border-green-500 bg-green-500/10 text-green-400'
              } else if (isSelected && !isCorrect) {
                optionClass = 'border-red-500 bg-red-500/10 text-red-400'
              }
            } else if (isSelected) {
              optionClass = 'border-primary bg-primary/10 text-primary'
            }

            return (
              <button
                key={option.id}
                onClick={() => {
                  if (store.status !== 'answered') {
                    const newSubmission = isSelected
                      ? currentSubmission.filter((id) => id !== option.id)
                      : [...currentSubmission, option.id]
                    setCurrentSubmission(newSubmission)
                  }
                }}
                className={`w-full rounded-lg border p-4 text-left text-sm transition-all hover:bg-muted ${optionClass}`}
                disabled={store.status === 'answered'}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs">
                    {option.id.toUpperCase()}
                  </span>
                  <span>{option.text}</span>
                  {showResult && isCorrect && (
                    <span className="ml-auto text-green-400">✓</span>
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <span className="ml-auto text-red-400">✗</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      {store.status === 'answered' && currentQuestion.explanation && (
        <div className="mb-6 rounded-lg border border-border bg-muted p-4">
          <h4 className="mb-2 font-semibold text-text-1">
            {t('quiz.explanation')}
          </h4>
          <p className="text-sm text-text-2">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-3">
            {t('quiz.streak')}: {store.streak} 🔥
          </span>
        </div>
        <div className="flex gap-3">
          {store.status !== 'answered' && (
            <>
              <button
                onClick={handleSkip}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:bg-muted"
              >
                {t('quiz.skip')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={currentSubmission.every((id) => id === '')}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {t('quiz.submit')}
              </button>
            </>
          )}
          {store.status === 'answered' && (
            <button
              onClick={handleNext}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              {t('quiz.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
