/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 *
 * Orchestrator: composes hooks (data + timers + submission) and
 * delegates rendering to atomic components.
 */

import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useQuizSessionStore } from '../../shared/lib/session-store'
import { useMotionEnabled } from '../../shared/lib/use-motion-enabled'
import { useQuizConfig } from './hooks/use-quiz-config'
import { useQuizSession } from './hooks/use-quiz-session'
import { useQuizTimers } from './hooks/use-quiz-timers'
import { useTotalTimer } from './hooks/use-total-timer'
import { useQuizSubmission } from './hooks/use-quiz-submission'
import { useQuizSessionEnd } from './hooks/use-quiz-session-end'
import { useQuestionFeed } from './hooks/use-question-feed'
import { useDevAnswerHint } from './hooks/use-dev-answer-hint'
import { useQuizKeyboard } from './hooks/use-quiz-keyboard'
import { getMode } from '../../features/modes'
import { QuizHeader } from './components/quiz-header'
import { QuizQuestion } from './components/quiz-question'
import { QuizOptions } from './components/quiz-options'
import { QuizExplanation } from './components/quiz-explanation'
import { QuizActions } from './components/quiz-actions'

// Static states hoisted to module level (rendering-hoist-jsx) so the
// orchestrator's early returns stay one-liners.
function QuizLoading() {
  const { t } = useTranslation()
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="text-lg text-text-2">{t('common.loading')}</div>
    </div>
  )
}

function QuizError({ message }: { message: string }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
      role="alert"
    >
      <p className="text-danger-ink">
        {t('common.error')}: {message}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-4 py-2 text-on-primary"
      >
        {t('common.retry')}
      </button>
    </div>
  )
}

/**
 * Question block — question + options as one unit, remounted (via `key`)
 * per question so the whole block fades/slides in. Motion is skipped when
 * animations are off (settings or OS reduced-motion).
 */
function QuestionFlow({
  question,
  selectedIds,
  status,
  onToggle,
}: {
  question: NonNullable<ReturnType<typeof useQuizSession>['currentQuestion']>
  selectedIds: string[]
  status: string
  onToggle: (id: string) => void
}) {
  const motionEnabled = useMotionEnabled()

  return (
    <motion.div
      initial={motionEnabled ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <QuizQuestion text={question.text} description={question.description} />

      <QuizOptions
        options={question.options}
        correctOptionIds={question.correctOptionIds}
        selectedIds={selectedIds}
        status={status}
        onToggle={onToggle}
      />
    </motion.div>
  )
}

export function QuizScreen() {
  // All hooks called unconditionally (before any early returns)
  const { t } = useTranslation()
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
    handleClear,
    hasSelection,
  } = useQuizSubmission(result.currentQuestion, mode.autoSubmitOnSelection)

  // Keyboard: 1–6 select, Enter submit/next, Esc clear selection.
  const options = result.currentQuestion?.options
  const toggleByIndex = useCallback(
    (index: number) => {
      const option = options?.[index]
      if (option) handleToggle(option.id)
    },
    [options, handleToggle],
  )
  const optionCount = options?.length ?? 0
  useQuizKeyboard({
    optionCount,
    status: store.status,
    hasSelection,
    onToggleIndex: toggleByIndex,
    onSubmit: handleSubmit,
    onNext: handleNext,
    onClear: handleClear,
  })

  useQuizSessionEnd(result.currentQuestion)
  const { waitingForBatch, batchError, retryBatch, finishWithoutBatch } =
    useQuestionFeed(effectiveConfig)
  useDevAnswerHint(result.currentQuestion)

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
  // Survival shows the real pool size (API `meta.total`) — its
  // question-count setting is ignored and batches keep arriving until
  // the API runs out. Other modes: the loaded pool equals the
  // configured count.
  const total =
    store.mode === 'survival' && store.questionsTotal
      ? Math.max(store.questionsTotal, store.questions.length)
      : store.questions.length

  // Timer length for the header bar: static or derived from question count.
  const timeLimit =
    typeof mode.timerLimit === 'function'
      ? mode.timerLimit(total)
      : mode.timerLimit

  // Whether the just-submitted answer was right (for the live region).
  const submitted = store.answers[question.id] ?? []
  const isAnswerCorrect =
    submitted.length > 0 &&
    question.correctOptionIds.length === submitted.length &&
    question.correctOptionIds.every((id) => submitted.includes(id))

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
        timeLimit={timeLimit}
        lives={store.lives}
        score={store.score}
      />

      <QuestionFlow
        key={question.id}
        question={question}
        selectedIds={currentSubmission}
        status={store.status}
        onToggle={handleToggle}
      />

      {/* Screen-reader announcements for the answer outcome. */}
      <p className="sr-only" role="status" aria-live="polite">
        {store.status === 'answered'
          ? isAnswerCorrect
            ? t('a11y.answer_correct')
            : t('a11y.answer_incorrect')
          : `${t('quiz.question')} ${progress}/${total}`}
      </p>

      {store.status === 'answered' && question.explanation ? (
        <QuizExplanation explanation={question.explanation} />
      ) : null}

      {/* A failed batch blocks progress at the pool's edge: offer a
          retry, or end the run honestly instead of freezing. */}
      {waitingForBatch && batchError ? (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-lg border border-danger bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-danger-ink">{t('quiz.batch_error')}</p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={retryBatch}
              className="rounded-lg bg-primary px-4 py-2 text-on-primary"
            >
              {t('common.retry')}
            </button>
            <button
              onClick={finishWithoutBatch}
              className="rounded-lg bg-muted px-4 py-2 text-text"
            >
              {t('quiz.finish_now')}
            </button>
          </div>
        </div>
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
