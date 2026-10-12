import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  canLoadMoreQuestions,
  useQuizSessionStore,
} from '../../../shared/lib/session-store'
import { checkAnswer, countCorrect } from '../utils/answer-utils'

export function useQuizSessionEnd(
  currentQuestion: { id: string; correctOptionIds: readonly string[] } | null,
) {
  const navigate = useNavigate()

  // Subscribe to a derived boolean, not the raw values — the effect only
  // cares about the transition (rerender-derived-state).
  // Answering the last loaded question only ends the session when no
  // further survival batch can arrive.
  const isSessionEnded = useQuizSessionStore(
    (s) =>
      s.status === 'finished' ||
      (s.status === 'answered' &&
        s.currentIndex >= s.questions.length - 1 &&
        !canLoadMoreQuestions(s)),
  )

  // One-shot guard: a ref avoids a state update (and an extra render)
  // purely to prevent the effect from running twice (use-ref-transient).
  const navigatedRef = useRef(false)

  useEffect(() => {
    if (!isSessionEnded || navigatedRef.current || !currentQuestion) return
    navigatedRef.current = true

    const store = useQuizSessionStore.getState()
    const currentCorrect = checkAnswer(
      currentQuestion.correctOptionIds,
      store.answers[currentQuestion.id] ?? [],
    )
    const prevCorrect = countCorrect(
      store.questions,
      store.answers,
      0,
      store.currentIndex,
    )
    const elapsed = store.sessionStartTime
      ? Math.floor((Date.now() - store.sessionStartTime) / 1000)
      : 0

    store.finishSession(
      store.score,
      elapsed,
      prevCorrect + (currentCorrect ? 1 : 0),
    )
    navigate({ to: '/results' })
  }, [isSessionEnded, currentQuestion, navigate])
}
