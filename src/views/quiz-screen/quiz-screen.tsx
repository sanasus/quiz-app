/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 *
 * Orchestrator: composes hooks (data + timers + submission) and
 * delegates rendering to atomic components.
 */

import { useEffect } from 'react'
import { useQuizSessionStore } from '../../shared/lib/session-store'
import { useQuizConfig } from './hooks/use-quiz-config'
import { useQuizSession } from './hooks/use-quiz-session'
import { useQuizTimers } from './hooks/use-quiz-timers'
import { useQuizSubmission } from './hooks/use-quiz-submission'
import { useQuizSessionEnd } from './hooks/use-quiz-session-end'
import { QuizHeader } from './components/quiz-header'
import { QuizQuestion } from './components/quiz-question'
import { QuizOptions } from './components/quiz-options'
import { QuizExplanation } from './components/quiz-explanation'
import { QuizActions } from './components/quiz-actions'

export function QuizScreen() {
  // All hooks called unconditionally (before any early returns)
  const store = useQuizSessionStore()
  const { effectiveConfig } = useQuizConfig()

  const result = useQuizSession(effectiveConfig)
  useQuizTimers(effectiveConfig)

  const {
    currentSubmission,
    setCurrentSubmission,
    handleSubmit,
    handleSkip,
    handleNext,
    hasSelection,
  } = useQuizSubmission(result.currentQuestion)

  useQuizSessionEnd(result.currentQuestion)

  // Blitz mode: auto-submit when selection changes
  useEffect(() => {
    if (store.mode === 'blitz' && hasSelection && store.status === 'playing') {
      handleSubmit()
    }
  }, [currentSubmission, store.mode, store.status])

  // ---------------------------------------------------------------------------
  // Early returns
  // ---------------------------------------------------------------------------

  if (!effectiveConfig) {
    return null
  }

  if (result.loadingState === 'loading' || !result.currentQuestion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-text-2">Loading...</div>
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-red-400">Error: {result.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  const progress = store.currentIndex + 1
  const total = store.questions.length

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="mx-auto max-w-2xl px-4 py-8"
      data-testid="quiz-screen"
    >
      <QuizHeader
        progress={progress}
        total={total}
        mode={store.mode}
        timeRemaining={store.timeRemaining}
        lives={store.lives}
        score={store.score}
      />

      <QuizQuestion
        text={result.currentQuestion.text}
        description={result.currentQuestion.description}
      />

      <QuizOptions
        options={result.currentQuestion.options}
        correctOptionIds={result.currentQuestion.correctOptionIds}
        selectedIds={currentSubmission}
        status={store.status}
        onToggle={(optionId) => {
          setCurrentSubmission((prev) =>
            prev.includes(optionId)
              ? prev.filter((id) => id !== optionId)
              : [...prev, optionId],
          )
        }}
      />

      {store.status === 'answered' && result.currentQuestion.explanation ? (
        <QuizExplanation explanation={result.currentQuestion.explanation} />
      ) : null}

      <QuizActions
        streak={store.streak}
        status={store.status}
        hasSelection={hasSelection}
        onSkip={handleSkip}
        onSubmit={handleSubmit}
        onNext={handleNext}
      />
    </div>
  )
}
