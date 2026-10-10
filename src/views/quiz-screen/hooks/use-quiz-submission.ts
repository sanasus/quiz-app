import { useCallback, useState } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { calculateScore } from '../../../shared/lib/scoring'
import type { Question } from '../../../shared/types/quiz'
import { checkAnswer } from '../utils/answer-utils'

export function useQuizSubmission(currentQuestion: Question | null) {
  const store = useQuizSessionStore()
  const [currentSubmission, setCurrentSubmission] = useState<string[]>([])

  const handleSubmit = useCallback(() => {
    if (!currentQuestion) return
    const selectedOptionIds = currentSubmission.filter((id) => id !== '')
    if (selectedOptionIds.length === 0) return

    for (const id of selectedOptionIds) {
      store.selectOption(id)
    }
    const isCorrect = checkAnswer(currentQuestion.correctOptionIds, selectedOptionIds)
    const scoreDelta = isCorrect
      ? calculateScore(store.config.difficulty, store.timeRemaining ?? 0, store.streak)
      : 0
    store.submitAnswer(scoreDelta)
  }, [currentQuestion, currentSubmission, store])

  const handleSkip = useCallback(() => {
    if (!currentQuestion) return
    store.skipQuestion()
  }, [currentQuestion, store])

  const handleNext = useCallback(() => {
    if (!currentQuestion) return
    setCurrentSubmission([])
    store.nextQuestion()
  }, [currentQuestion, setCurrentSubmission, store])

  const hasSelection = currentSubmission.some((id) => id !== '')

  return {
    currentSubmission,
    setCurrentSubmission,
    handleSubmit,
    handleSkip,
    handleNext,
    hasSelection,
  } as const
}
