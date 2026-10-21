import { useEffect } from 'react'
import { useProviderStore } from '../../../shared/api/provider-store'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import type { Question } from '../../../shared/types/quiz'
import { recordAnswer } from '../../../features/history/history-db'
import { checkAnswer } from '../utils/answer-utils'

/**
 * Writes each answered question to the history as soon as the result is
 * shown (correct / wrong, a timeout counts as wrong), so a run abandoned
 * halfway still remembers what it saw. Fire-and-forget: history is best
 * effort and never blocks the quiz.
 */
export function useHistoryRecorder(currentQuestion: Question | null) {
  const status = useQuizSessionStore((s) => s.status)

  useEffect(() => {
    if (status !== 'answered' || !currentQuestion) return
    const selected =
      useQuizSessionStore.getState().answers[currentQuestion.id] ?? []
    void recordAnswer(
      useProviderStore.getState().providerId,
      currentQuestion.id,
      checkAnswer(currentQuestion.correctOptionIds, selected)
        ? 'correct'
        : 'wrong',
    )
  }, [status, currentQuestion])
}
