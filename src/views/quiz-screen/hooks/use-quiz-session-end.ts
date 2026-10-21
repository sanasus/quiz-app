import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  canLoadMoreQuestions,
  useQuizSessionStore,
} from '../../../shared/lib/session-store'
import { trackRunFinished } from '../../../shared/analytics/run-events'
import { useProviderStore } from '../../../shared/api/provider-store'
import { recordAnswer } from '../../../features/history/history-db'
import { checkAnswer } from '../../../shared/lib/answers'
import { countCorrect } from '../utils/answer-utils'

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
    const finished = useQuizSessionStore.getState().finishedSession
    // The per-answer recorder has written every answered question already.
    // The one case it cannot see: a time-up on the very last question ends
    // the run without an «answered» pause, leaving an unanswered attempt.
    const last = finished?.attempts.at(-1)
    if (last && last.selectedOptionIds.length === 0) {
      void recordAnswer(
        useProviderStore.getState().providerId,
        last.question.id,
        'wrong',
      )
    }
    if (finished) {
      trackRunFinished({
        correct: finished.correctCount,
        total: finished.totalQuestions,
        score: finished.score,
      })
    }
    navigate({ to: '/results' })
  }, [isSessionEnded, currentQuestion, navigate])
}
