import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { checkAnswer, countCorrect } from '../utils/answer-utils'

export function useQuizSessionEnd(currentQuestion: { id: string; correctOptionIds: readonly string[] } | null) {
  const navigate = useNavigate()
  const store = useQuizSessionStore()

  const isSessionEnded =
    store.status === 'finished' ||
    (store.status === 'answered' && store.currentIndex >= store.questions.length - 1)

  const [navigated, setNavigated] = useState(false)

  useEffect(() => {
    if (!isSessionEnded || navigated || !currentQuestion) return
    setNavigated(true)

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

    store.finishSession(store.score, elapsed, prevCorrect + (currentCorrect ? 1 : 0))
    navigate({ to: '/results' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionEnded, navigated])
}
