import { useEffect, useRef } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { useQuizQuestions } from '../../../shared/api/quizapi'
import type { QuizConfig, Question } from '../../../shared/types/quiz'

export interface QuizSessionResult {
  currentQuestion: Question | null
  loadingState: 'loading' | 'ready'
  error: Error | null
  /**
   * Refetch the failed initial fetch. Undefined in a repeat session —
   * its questions come from the store, there is nothing to fetch.
   */
  refetch: (() => Promise<unknown>) | undefined
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

  // The repeat-session branch of useQuizQuestions returns a plain
  // object without query controls — narrow the union with `in`.
  const refetch = 'refetch' in query ? query.refetch : undefined
  const isFetching = 'isFetching' in query ? query.isFetching : false

  // `error` is returned in both branches: otherwise a failed initial fetch
  // would be indistinguishable from loading (error UI never reachable).
  return {
    currentQuestion,
    loadingState: currentQuestion ? 'ready' : 'loading',
    error,
    refetch,
    isFetching,
  }
}
