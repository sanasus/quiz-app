/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 *
 * Orchestrator: composes hooks (data + timers + submission) and
 * delegates rendering to atomic components.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useQuizSessionStore } from '../../shared/lib/session-store'
import { useMotionEnabled } from '../../shared/lib/use-motion-enabled'
import { QuizApiError, type ApiProviderId } from '../../shared/api/errors'
import { useProviderStore } from '../../shared/api/provider-store'
import { PROVIDERS } from '../../shared/api/providers'
import { ApiErrorDialog } from '../../shared/ui/api-error-dialog'
import { track } from '../../shared/analytics/analytics'
import { AppToast } from '../../shared/ui/app-toast'
import { ConfirmDialog } from '../../shared/ui/confirm-dialog'
import { SourcesUnavailable } from '../../shared/ui/sources-unavailable'
import {
  isDegraded,
  useProviderHealth,
} from '../../features/provider/provider-health'
import { reportQuestion } from '../../features/history/history-db'
import { useChangeProvider } from '../../features/provider/use-change-provider'
import { useQuizConfig } from './hooks/use-quiz-config'
import { useQuizSession } from './hooks/use-quiz-session'
import { useQuizTimers } from './hooks/use-quiz-timers'
import { useTotalTimer } from './hooks/use-total-timer'
import { useQuizSubmission } from './hooks/use-quiz-submission'
import { useQuizSessionEnd } from './hooks/use-quiz-session-end'
import { useHistoryRecorder } from './hooks/use-history-recorder'
import { useLeaveGuard } from './hooks/use-leave-guard'
import { useQuestionFeed } from './hooks/use-question-feed'
import { useDevAnswerHint } from './hooks/use-dev-answer-hint'
import { useQuizKeyboard } from './hooks/use-quiz-keyboard'
import { getMode } from '../../features/modes'
import { QuizHeader, type QuizHeaderProps } from './components/quiz-header'
import { QuizQuestion } from './components/quiz-question'
import { QuizOptions } from './components/quiz-options'
import { QuizExplanation } from './components/quiz-explanation'
import { ReportQuestionButton } from './components/report-question-button'
import {
  NEXT_DELAY_CORRECT_MS,
  NEXT_DELAY_INCORRECT_MS,
  NextCountdown,
} from './components/next-countdown'

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

/**
 * Question block — question + options as one unit, remounted (via `key`)
 * per question so the whole block fades/slides in. Motion is skipped when
 * animations are off (settings or OS reduced-motion).
 */
function QuestionFlow({
  question,
  selectedIds,
  status,
  onSelect,
}: {
  question: NonNullable<ReturnType<typeof useQuizSession>['currentQuestion']>
  selectedIds: string[]
  status: string
  onSelect: (id: string) => void
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
        onSelect={onSelect}
      />
    </motion.div>
  )
}

/**
 * The header is the only part that follows the per-second timer, so it
 * subscribes to the live numbers itself and the screen around it stays put.
 */
function ConnectedQuizHeader({
  progress,
  total,
  timeLimit,
  paused,
}: Pick<QuizHeaderProps, 'progress' | 'total' | 'timeLimit' | 'paused'>) {
  const mode = useQuizSessionStore((s) => s.mode)
  const timeRemaining = useQuizSessionStore((s) => s.timeRemaining)
  const lives = useQuizSessionStore((s) => s.lives)
  const score = useQuizSessionStore((s) => s.score)
  const streak = useQuizSessionStore((s) => s.streak)

  return (
    <QuizHeader
      progress={progress}
      total={total}
      mode={mode}
      timeRemaining={timeRemaining}
      timeLimit={timeLimit}
      lives={lives}
      score={score}
      streak={streak}
      paused={paused}
    />
  )
}

export function QuizScreen() {
  // All hooks called unconditionally (before any early returns)
  const { t } = useTranslation()
  // Selectors, not the whole store: the timer ticks every second and only
  // the header (see ConnectedQuizHeader) needs to follow it.
  const sessionMode = useQuizSessionStore((s) => s.mode)
  const status = useQuizSessionStore((s) => s.status)
  const currentIndex = useQuizSessionStore((s) => s.currentIndex)
  const loaded = useQuizSessionStore((s) => s.questions.length)
  const questionsTotal = useQuizSessionStore((s) => s.questionsTotal)
  const answers = useQuizSessionStore((s) => s.answers)
  const { effectiveConfig } = useQuizConfig()
  const mode = getMode(sessionMode)

  const result = useQuizSession(effectiveConfig)
  useQuizTimers(effectiveConfig)
  useTotalTimer(effectiveConfig)

  const { currentSubmission, handleNext, handleSelect } = useQuizSubmission(
    result.currentQuestion,
  )

  // Keyboard: 1–9 answer, Enter advances early.
  const options = result.currentQuestion?.options
  const selectByIndex = useCallback(
    (index: number) => {
      const option = options?.[index]
      if (option) handleSelect(option.id)
    },
    [options, handleSelect],
  )
  const optionCount = options?.length ?? 0
  useQuizKeyboard({
    optionCount,
    status,
    onSelectIndex: selectByIndex,
    onNext: handleNext,
  })

  useQuizSessionEnd(result.currentQuestion)
  const {
    waitingForBatch,
    batchError,
    retryBatch,
    isFetching: batchFetching,
  } = useQuestionFeed(effectiveConfig)
  useDevAnswerHint(result.currentQuestion)
  const leaveGuard = useLeaveGuard()
  useHistoryRecorder(result.currentQuestion)

  // Notices: «no new questions, repeating» at the start, and the report
  // confirmation. `reportedIds` also disables the button per question.
  const [repeatsDismissed, setRepeatsDismissed] = useState(false)
  const [reportedIds, setReportedIds] = useState<string[]>([])
  const [reportToast, setReportToast] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Error dialog (initial fetch vs survival batch)
  // ---------------------------------------------------------------------------

  const providerId = useProviderStore((s) => s.providerId)
  const changeProvider = useChangeProvider()

  // The dialog shows the first active failure. The two sources can't
  // overlap: a batch only exists once questions are loaded, i.e. after
  // the initial fetch succeeded.
  const initialError = result.error
  const errorMessage = initialError ? initialError.message : batchError

  // Single source of truth for openness: errors open the dialog, a
  // clean state closes it. Derived during render (no effect): later
  // errors while it's open never re-trigger anything.
  const [dialogOpen, setDialogOpen] = useState(errorMessage !== null)
  const [prevErrorMessage, setPrevErrorMessage] = useState(errorMessage)
  if (errorMessage !== prevErrorMessage) {
    setPrevErrorMessage(errorMessage)
    setDialogOpen(errorMessage !== null)
  }

  const retryInitial = result.refetch
  const handleRetry = useCallback(() => {
    if (initialError) retryInitial?.()
    else retryBatch()
  }, [initialError, retryInitial, retryBatch])

  // Reset timer when the question changes (blitz mode only).
  // Narrowed to primitive deps so the effect doesn't re-run on unrelated
  // store updates (rerender-dependencies).
  const resetBlitzTimer = useQuizSessionStore((s) => s.resetBlitzTimer)
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

  // Both sources failed: switching cannot help, so the dialog drops
  // «Change API» and a failed initial load shows the unavailable page.
  const failures = useProviderHealth((s) => s.failures)
  // eslint-disable-next-line react-hooks/purity -- a failure expires with time
  const degraded = isDegraded(failures, Date.now())

  const retryProvider = (id: ApiProviderId) => {
    if (id === providerId) handleRetry()
    else changeProvider(id, { reason: 'degraded_retry' })
  }

  const errorDialog = (
    <>
      <ApiErrorDialog
        open={dialogOpen}
        providerLabelKey={PROVIDERS[providerId].labelKey}
        errorMessage={errorMessage}
        retrying={initialError ? result.isFetching : batchFetching}
        onRetry={handleRetry}
        canChange={!degraded}
        onChangeApi={() =>
          changeProvider(undefined, {
            reason: 'error_dialog',
            kind:
              initialError instanceof QuizApiError
                ? initialError.kind
                : undefined,
          })
        }
      />
      <ConfirmDialog
        open={leaveGuard.open}
        title={t('leave.title')}
        message={t('leave.message')}
        confirmLabel={t('leave.confirm')}
        cancelLabel={t('leave.stay')}
        testId="leave-quiz"
        onConfirm={leaveGuard.leave}
        onCancel={leaveGuard.stay}
      />
    </>
  )

  if (!effectiveConfig) {
    return null
  }

  // Error before loading: the dialog sits over the loading state until
  // the user retries or switches the provider.
  if (result.loadingState === 'loading' || !result.currentQuestion) {
    if (degraded && initialError) {
      return (
        <div className="mx-auto max-w-lg px-4 py-8">
          <SourcesUnavailable
            busy={result.isFetching}
            onRetry={retryProvider}
          />
        </div>
      )
    }
    return (
      <>
        <QuizLoading />
        {errorDialog}
      </>
    )
  }

  const question = result.currentQuestion
  const progress = currentIndex + 1
  // Survival shows the real pool size (API `meta.total`) — its
  // question-count setting is ignored and batches keep arriving until
  // the API runs out. Other modes: the loaded pool equals the
  // configured count.
  const total =
    sessionMode === 'survival' && questionsTotal
      ? Math.max(questionsTotal, loaded)
      : loaded

  // Timer length for the header bar: static or derived from question count.
  const timeLimit =
    typeof mode.timerLimit === 'function'
      ? mode.timerLimit(total)
      : mode.timerLimit

  // Whether the just-submitted answer was right (for the live region).
  const submitted = answers[question.id] ?? []
  const isAnswerCorrect =
    submitted.length > 0 &&
    question.correctOptionIds.length === submitted.length &&
    question.correctOptionIds.every((id) => submitted.includes(id))

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="quiz-screen">
      <ConnectedQuizHeader
        progress={progress}
        total={total}
        timeLimit={timeLimit}
        paused={status === 'answered'}
      />

      <QuestionFlow
        key={question.id}
        question={question}
        selectedIds={currentSubmission}
        status={status}
        onSelect={handleSelect}
      />

      {/* Screen-reader announcements for the answer outcome. */}
      <p className="sr-only" role="status" aria-live="polite">
        {status === 'answered'
          ? isAnswerCorrect
            ? t('a11y.answer_correct')
            : t('a11y.answer_incorrect')
          : `${t('quiz.question')} ${progress}/${total}`}
      </p>

      {status === 'answered' && question.explanation ? (
        <QuizExplanation explanation={question.explanation} />
      ) : null}

      {/* A failed batch blocks progress at the pool's edge: the error
          dialog above offers a retry or a provider switch. */}
      {status === 'answered' ? (
        <NextCountdown
          key={`next-${question.id}`}
          delayMs={
            isAnswerCorrect ? NEXT_DELAY_CORRECT_MS : NEXT_DELAY_INCORRECT_MS
          }
          blocked={waitingForBatch}
          onNext={handleNext}
        />
      ) : null}

      <ReportQuestionButton
        reported={reportedIds.includes(question.id)}
        onReport={() => {
          void reportQuestion(providerId, question.id)
          track('question_reported', { provider: providerId })
          setReportedIds((ids) => [...ids, question.id])
          setReportToast(t('quiz.reported'))
        }}
      />

      {reportToast ? (
        <AppToast
          message={reportToast}
          position="bottom"
          onDismiss={() => setReportToast(null)}
        />
      ) : result.repeats && !repeatsDismissed ? (
        <AppToast
          message={t('quiz.repeats_notice')}
          position="bottom"
          onDismiss={() => setRepeatsDismissed(true)}
        />
      ) : null}

      {errorDialog}
    </div>
  )
}
