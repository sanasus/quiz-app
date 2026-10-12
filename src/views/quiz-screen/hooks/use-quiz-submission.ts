import { useCallback, useState } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { calculateScore } from '../../../shared/lib/scoring'
import type { Question } from '../../../shared/types/quiz'
import { checkAnswer } from '../utils/answer-utils'

/**
 * Submission state and handlers for the current question.
 *
 * Intentionally does NOT subscribe to the session store: everything it
 * needs is either an argument (current question) or read at call time via
 * `useQuizSessionStore.getState()`. That keeps callbacks stable across
 * timer ticks and other store updates instead of recreating them every
 * render (rerender-defer-reads).
 */
export function useQuizSubmission(
  currentQuestion: Question | null,
  autoSubmitOnSelection: boolean,
) {
  const [currentSubmission, setCurrentSubmission] = useState<string[]>([])

  const submitSelection = useCallback(
    (selection: readonly string[]) => {
      if (!currentQuestion) return
      const selectedOptionIds = selection.filter((id) => id !== '')
      if (selectedOptionIds.length === 0) return

      const store = useQuizSessionStore.getState()
      for (const id of selectedOptionIds) {
        store.selectOption(id)
      }
      const isCorrect = checkAnswer(
        currentQuestion.correctOptionIds,
        selectedOptionIds,
      )
      const scoreDelta = isCorrect
        ? calculateScore(
            store.config.difficulty,
            store.timeRemaining ?? 0,
            store.streak,
          )
        : 0
      store.submitAnswer(scoreDelta)
    },
    [currentQuestion],
  )

  const handleSubmit = useCallback(
    () => submitSelection(currentSubmission),
    [currentSubmission, submitSelection],
  )

  const handleToggle = useCallback(
    (optionId: string) => {
      const next = currentSubmission.includes(optionId)
        ? currentSubmission.filter((id) => id !== optionId)
        : [...currentSubmission, optionId]
      setCurrentSubmission(next)

      // Auto-submit (blitz mode) is interaction logic, so it lives in the
      // event handler instead of an effect that re-ran on unrelated store
      // updates (rerender-move-effect-to-event).
      if (
        autoSubmitOnSelection &&
        useQuizSessionStore.getState().status === 'playing'
      ) {
        submitSelection(next)
      }
    },
    [currentSubmission, autoSubmitOnSelection, submitSelection],
  )

  const handleSkip = useCallback(() => {
    if (!currentQuestion) return
    useQuizSessionStore.getState().skipQuestion()
  }, [currentQuestion])

  const handleNext = useCallback(() => {
    if (!currentQuestion) return
    setCurrentSubmission([])
    useQuizSessionStore.getState().nextQuestion()
  }, [currentQuestion])

  const hasSelection = currentSubmission.some((id) => id !== '')

  return {
    currentSubmission,
    handleSubmit,
    handleSkip,
    handleNext,
    handleToggle,
    hasSelection,
  } as const
}
