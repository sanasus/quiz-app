import { useEffect, useRef } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { useQuizQuestions } from '../../../shared/api/quizapi'
import type { QuizConfig, Question } from '../../../shared/types/quiz'

export interface QuizSessionResult {
  currentQuestion: Question | null
  loadingState: 'loading' | 'ready'
  error: Error | null
  /** Refetch the failed initial fetch. */
  refetch: () => Promise<unknown>
  /** A refetch is in flight — drives the error dialog's spinner. */
  isFetching: boolean
}

export function useQuizSession(
  effectiveConfig: QuizConfig | null,
): QuizSessionResult {
  const store = useQuizSessionStore()
  const prevConfigRef = useRef<string | null>(null)
  const query = useQuizQuestions(effectiveConfig)
  const { data, error } = query
  const questions = data?.questions

  useEffect(() => {
    if (!questions || !effectiveConfig) return
    if (store.questions.length > 0) return

    const configKey = `${effectiveConfig.category}-${effectiveConfig.difficulty}-${effectiveConfig.questionCount}-${effectiveConfig.mode}`
    if (prevConfigRef.current === configKey) return
    prevConfigRef.current = configKey

    store.reset()
    store.loadQuestions(questions, effectiveConfig, data?.total)

    store.startPlaying()
    store.startSessionTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, effectiveConfig, store.questions.length])

  const currentQuestion: Question | null =
    store.questions[store.currentIndex] ?? null

  return {
    currentQuestion,
    loadingState: currentQuestion ? 'ready' : 'loading',
    error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}
