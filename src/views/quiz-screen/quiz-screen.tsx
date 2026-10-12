/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 *
 * Orchestrator: composes hooks (data + timers + submission) and
 * delegates rendering to atomic components.
 */

import { useEffect, useRef } from 'react'
import { useQuizSessionStore } from '../../shared/lib/session-store'
import { useQuizConfig } from './hooks/use-quiz-config'
import { useQuizSession } from './hooks/use-quiz-session'
import { useQuizTimers } from './hooks/use-quiz-timers'
import { useTotalTimer } from './hooks/use-total-timer'
import { useQuizSubmission } from './hooks/use-quiz-submission'
import { useQuizSessionEnd } from './hooks/use-quiz-session-end'
import { useQuestionFeed } from './hooks/use-question-feed'
import { getMode } from '../../features/modes'
import { QuizHeader } from './components/quiz-header'
import { QuizQuestion } from './components/quiz-question'
import { QuizOptions } from './components/quiz-options'
import { QuizExplanation } from './components/quiz-explanation'
import { QuizActions } from './components/quiz-actions'

// Static states hoisted to module level (rendering-hoist-jsx) so the
// orchestrator's early returns stay one-liners.
function QuizLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-lg text-text-2">Loading...</div>
    </div>
  )
}

function QuizError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-red-400">Error: {message}</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-4 py-2 text-white"
      >
        Retry
      </button>
    </div>
  )
}

export function QuizScreen() {
  // All hooks called unconditionally (before any early returns)
  const store = useQuizSessionStore()
  const { effectiveConfig } = useQuizConfig()
  const mode = getMode(store.mode)

  const result = useQuizSession(effectiveConfig)
  useQuizTimers(effectiveConfig)
  useTotalTimer(effectiveConfig)

  const {
    currentSubmission,
    handleSubmit,
    handleSkip,
    handleNext,
    handleToggle,
    hasSelection,
  } = useQuizSubmission(result.currentQuestion, mode.autoSubmitOnSelection)

  useQuizSessionEnd(result.currentQuestion)
  const { waitingForBatch } = useQuestionFeed(effectiveConfig)

  // Reset timer when the question changes (blitz mode only).
  // Narrowed to primitive deps so the effect doesn't re-run on unrelated
  // store updates (rerender-dependencies).
  const { status, currentIndex, resetBlitzTimer } = store
  const prevQuestionIndexRef = useRef<number>(currentIndex)
  useEffect(() => {
    if (mode.timerBehavior !== 'per-question') return
    if (status !== 'playing') return
    if (prevQuestionIndexRef.current === currentIndex) return
    prevQuestionIndexRef.current = currentIndex
    resetBlitzTimer()
  }, [mode.timerBehavior, status, currentIndex, resetBlitzTimer])

  // ---------------------------------------------------------------------------
  // Early returns
  // ---------------------------------------------------------------------------

  if (!effectiveConfig) {
    return null
  }

  // Error before loading: a failed initial fetch must show the retry UI,
  // not an endless "Loading...".
  if (result.error) {
    return <QuizError message={result.error.message} />
  }

  if (result.loadingState === 'loading' || !result.currentQuestion) {
    return <QuizLoading />
  }

  const question = result.currentQuestion
  const progress = store.currentIndex + 1
  // Survival reports the configured target: the pool loads in batches,
  // so `questions.length` undercounts until the last batch arrives.
  const total =
    store.mode === 'survival' && !store.repeatConfig
      ? store.config.questionCount
      : store.questions.length

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="quiz-screen">
      <QuizHeader
        progress={progress}
        total={total}
        mode={store.mode}
        timeRemaining={store.timeRemaining}
        lives={store.lives}
        score={store.score}
      />

      <QuizQuestion text={question.text} description={question.description} />

      <QuizOptions
        options={question.options}
        correctOptionIds={question.correctOptionIds}
        selectedIds={currentSubmission}
        status={store.status}
        onToggle={handleToggle}
      />

      {store.status === 'answered' && question.explanation ? (
        <QuizExplanation explanation={question.explanation} />
      ) : null}

      <QuizActions
        streak={store.streak}
        status={store.status}
        hasSelection={hasSelection}
        nextDisabled={waitingForBatch}
        onSkip={handleSkip}
        onSubmit={handleSubmit}
        onNext={handleNext}
      />
    </div>
  )
}
