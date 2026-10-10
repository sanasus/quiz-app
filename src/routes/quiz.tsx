/**
 * /quiz — Quiz screen with timer, answer flow, and results.
 *
 * Mode-specific behavior:
 * - classic: standard per-question flow, no time limit.
 * - timed: countdown per question (30s), auto-advance on timeout.
 * - blitz: countdown for entire session (5min), speed-based scoring.
 * - survival: lose a life on wrong answer, game over at 0 lives.
 */

import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuizQuestions } from '../shared/api/quizapi'
import { useQuizSessionStore } from '../shared/lib/session-store'
import { calculateScore } from '../shared/lib/scoring'
import { quizConfigSchema } from './-index'
import { useShallow } from 'zustand/react/shallow'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds as mm:ss. */
function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Get the time limit for timed mode (seconds per question). */
function getTimedTimeLimit(questionCount: number): number {
  // Fewer questions = more time per question
  if (questionCount <= 5) return 45
  if (questionCount <= 15) return 30
  if (questionCount <= 30) return 25
  return 20
}

/** Get the blitz total time (seconds). */
function getBlitzTimeLimit(questionCount: number): number {
  return questionCount * 20 // 20s per question average
}

export const QuizScreen = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, string>

  // Parse and validate config from search params
  const configResult = quizConfigSchema.safeParse(search)
  const config = configResult.success ? configResult.data : null

  const store = useQuizSessionStore()
  const questionStartTime = useRef<number>(0)
  const sessionStartTime = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishedRef = useRef<boolean>(false)
  const storeRef = useRef(store)
  const prevConfigRef = useRef<string | null>(null)

  // Keep ref in sync with the latest store reference
  useEffect(() => {
    storeRef.current = store
  }, [store])

  // Selector for the session-end effect — stable reference when fields don't change
  const sessionEndDeps = useQuizSessionStore(
    useShallow((s) => ({
      status: s.status,
      finishedSession: s.finishedSession,
      questions: s.questions,
      answers: s.answers,
      streak: s.streak,
      score: s.score,
      mode: s.mode,
      timeRemaining: s.timeRemaining,
      lives: s.lives,
    })),
  )

  // ---------------------------------------------------------------------------
  // Current question
  // ---------------------------------------------------------------------------

  const currentQuestion = store.questions[store.currentIndex]
  const currentQuestionId = currentQuestion?.id ?? null
  const prevQuestionIdRef = useRef<string | null>(null)

  // ---------------------------------------------------------------------------
  // Timer logic for timed / blitz modes
  // ---------------------------------------------------------------------------

  // Main timer effect — runs ONLY when question changes (not on every store update)
  useEffect(() => {
    if (!currentQuestionId) return

    // Only reset timer when the question actually changes
    if (prevQuestionIdRef.current !== currentQuestionId) {
      prevQuestionIdRef.current = currentQuestionId
      questionStartTime.current = Date.now()

      if (storeRef.current.mode === 'timed' && storeRef.current.questions.length > 0) {
        const timeLimit = getTimedTimeLimit(storeRef.current.questions.length)
        storeRef.current.startTimer(timeLimit)
      }
      // Blitz timer is initialized once in the load effect (session-wide)
    }

    // Start countdown interval
    timerRef.current = setInterval(() => {
      storeRef.current.timerTick()
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [currentQuestionId])

  // Handle timer reaching zero (auto-submit / auto-finish)
  useEffect(() => {
    if (store.timeRemaining === 0 && store.status === 'playing') {
      if (store.mode === 'timed') {
        store.timeUp()
      } else if (store.mode === 'blitz') {
        store.timeUp()
      }
    }
  }, [store.timeRemaining, store.status, store.mode])

  // ---------------------------------------------------------------------------
  // Load questions when config is valid
  // ---------------------------------------------------------------------------

  const { data: questions, error } = useQuizQuestions(config)

  useEffect(() => {
    if (!questions || !config) return

    // Detect config changes via ref to avoid stale query cache issues
    const configKey = `${config.category}-${config.difficulty}-${config.questionCount}-${config.mode}`
    if (prevConfigRef.current === configKey) return
    prevConfigRef.current = configKey

    sessionStartTime.current = Date.now()
    storeRef.current.reset()
    storeRef.current.loadQuestions(questions, config)

    // Initialize timer based on mode
    if (config.mode === 'timed') {
      const timeLimit = getTimedTimeLimit(config.questionCount)
      storeRef.current.startTimer(timeLimit)
    } else if (config.mode === 'blitz') {
      const timeLimit = getBlitzTimeLimit(config.questionCount)
      storeRef.current.startTimer(timeLimit)
    }

    storeRef.current.startPlaying()
  }, [questions, config])

  // ---------------------------------------------------------------------------
  // Handle session end (all questions answered or time up)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      sessionEndDeps.status === 'finished' &&
      !sessionEndDeps.finishedSession &&
      !finishedRef.current
    ) {
      finishedRef.current = true

      const correctCount = sessionEndDeps.questions.filter((q) => {
        const selected = sessionEndDeps.answers[q.id] ?? []
        return (
          q.correctOptionIds.length === selected.length &&
          q.correctOptionIds.every((id) => selected.includes(id))
        )
      }).length

      // Use store.score (already updated by submitAnswer) + blitz bonus
      let totalScore = sessionEndDeps.score
      if (sessionEndDeps.mode === 'blitz' && sessionEndDeps.timeRemaining != null) {
        const blitzLimit = config
          ? getBlitzTimeLimit(config.questionCount)
          : 300
        const timeRatio = sessionEndDeps.timeRemaining / blitzLimit
        totalScore += Math.round(timeRatio * 20) // up to 20 bonus points
      }

      storeRef.current.finishSession(
        totalScore,
        Math.floor((Date.now() - sessionStartTime.current) / 1000),
        correctCount,
      )
      navigate({ to: '/results' })
    }
  }, [sessionEndDeps, navigate, config])

  if (!config) {
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
        <p className="text-lg text-danger">{error.message}</p>
        <button
          type="button"
          onClick={() => navigate({ to: '/setup' })}
          className="rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/90"
        >
          {t('common.back')}
        </button>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-text-2">{t('common.loading')}</p>
      </div>
    )
  }

  const selected = store.answers[currentQuestion.id] ?? []
  const isAnswered = selected.length > 0

  const handleOptionClick = (optionId: string) => {
    store.selectOption(optionId)
  }

  const handleSubmit = () => {
    const timeSec = Math.floor(
      (Date.now() - questionStartTime.current) / 1000,
    )
    const scoreDelta = calculateScore(
      currentQuestion.difficulty,
      timeSec,
      store.streak,
    )
    store.submitAnswer(scoreDelta)
  }

  const handleSkip = () => {
    store.skipQuestion()
  }

  const handleNext = () => {
    store.nextQuestion()
  }

  // Calculate score for current question
  const currentScore = store.score
  const streak = store.streak

  // Timer display
  const showTimer = store.mode === 'timed' || store.mode === 'blitz'
  const timerValue = showTimer ? (store.timeRemaining ?? 0) : 0
  const isTimerCritical = timerValue > 0 && timerValue <= 5

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header bar */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-text-2">
          {t('quiz.progress', {
            current: store.currentIndex + 1,
            total: store.questions.length,
          })}
        </span>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-primary">
            {t('quiz.score', { score: currentScore })}
          </span>
          {streak > 0 && (
            <span className="text-warning">🔥 {streak}</span>
          )}
          {/* Timer for timed/blitz modes */}
          {showTimer && (
            <span
              className={`font-mono font-bold ${isTimerCritical ? 'text-danger animate-pulse' : 'text-text-2'}`}
            >
              ⏱ {formatTime(timerValue)}
            </span>
          )}
          {/* Lives for survival mode */}
          {store.mode === 'survival' && (
            <span className="text-danger">
              {'❤️'.repeat(store.lives)}
              {'🖤'.repeat(Math.max(0, 3 - store.lives))}
            </span>
          )}
        </div>
      </div>

      {/* Timer progress bar (timed/blitz) */}
      {showTimer && timerValue > 0 && (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${isTimerCritical ? 'bg-danger' : 'bg-primary'}`}
            style={{
              width: `${Math.min(100, (timerValue / (store.mode === 'timed'
                ? getTimedTimeLimit(store.questions.length)
                : getBlitzTimeLimit(config.questionCount))
              ) * 100)}%`,
            }}
          />
        </div>
      )}

      {/* Question */}
      <div className="mb-6 rounded-xl bg-surface p-6 shadow-md">
        <h2 className="mb-2 text-xl font-bold text-text">
          {currentQuestion.text}
        </h2>
        {currentQuestion.description && (
          <p className="text-text-2">{currentQuestion.description}</p>
        )}
      </div>

      {/* Options */}
      <div className="mb-6 flex flex-col gap-3">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selected.includes(option.id)
          const letter = String.fromCharCode(65 + idx) // A, B, C, ...

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionClick(option.id)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all
                ${
                  isSelected
                    ? 'border-primary bg-primary/10 font-semibold text-primary shadow-sm'
                    : 'border-border bg-surface text-text hover:border-border/60 hover:bg-muted'
                }`}
              aria-pressed={isSelected}
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text-3'
                }`}
              >
                {letter}
              </span>
              <span>{option.text}</span>
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 flex-wrap">
        {/* After selecting options but before submitting */}
        {isAnswered && store.status === 'playing' && (
          <>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              {t('quiz.submit')}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-lg border-2 border-border bg-surface px-6 py-2.5 font-semibold text-text-2 transition-colors hover:bg-muted"
            >
              {t('quiz.skip')}
            </button>
          </>
        )}
        {/* After submitting — show next or finish */}
        {store.status === 'answered' && isAnswered && (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            {t('quiz.next')}
          </button>
        )}
      </div>

      {/* Explanation */}
      {store.status === 'answered' && currentQuestion.explanation && (
        <div className="mt-4 rounded-xl bg-muted p-4 text-sm text-text-2">
          <strong>{t('quiz.explanation')}:</strong> {currentQuestion.explanation}
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/quiz')({
  component: QuizScreen,
})
