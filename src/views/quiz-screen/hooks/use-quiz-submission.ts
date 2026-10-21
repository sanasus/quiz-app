import { useCallback, useEffect, useRef, useState } from 'react'
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
export function useQuizSubmission(currentQuestion: Question | null) {
  const [currentSubmission, setCurrentSubmission] = useState<string[]>([])

  // Wall-clock start of the current question: the speed bonus is based
  // on the time actually spent answering, not on the remaining timer.
  // Stamped in an effect (Date.now is impure during render); unset ref
  // is treated as "just started".
  const questionStartRef = useRef<number>(0)
  const questionId = currentQuestion?.id
  useEffect(() => {
    questionStartRef.current = Date.now()
  }, [questionId])

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
      const elapsedSec =
        questionStartRef.current > 0
          ? Math.max(0, (Date.now() - questionStartRef.current) / 1000)
          : 0
      const scoreDelta = isCorrect
        ? calculateScore(store.config.difficulty, elapsedSec, store.streak)
        : 0
      store.submitAnswer(scoreDelta)
    },
    [currentQuestion],
  )

  /** One click answers: single choice, no confirmation step. */
  const handleSelect = useCallback(
    (optionId: string) => {
      if (useQuizSessionStore.getState().status !== 'playing') return
      setCurrentSubmission([optionId])
      submitSelection([optionId])
    },
    [submitSelection],
  )

  const handleNext = useCallback(() => {
    if (!currentQuestion) return
    setCurrentSubmission([])
    useQuizSessionStore.getState().nextQuestion()
  }, [currentQuestion])

  return {
    currentSubmission,
    handleSelect,
    handleNext,
  } as const
}
