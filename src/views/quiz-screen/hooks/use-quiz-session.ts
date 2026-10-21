import { useEffect, useRef, useState } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { useQuizQuestions } from '../../../shared/api/quizapi'
import { useProviderStore } from '../../../shared/api/provider-store'
import { getProvider } from '../../../shared/api/providers'
import {
  cursorKey,
  useCursorStore,
} from '../../../features/history/cursor-store'
import type { QuizConfig, Question } from '../../../shared/types/quiz'

export interface QuizSessionResult {
  currentQuestion: Question | null
  loadingState: 'loading' | 'ready'
  error: Error | null
  /** Refetch the failed initial fetch. */
  refetch: () => Promise<unknown>
  /** A refetch is in flight — drives the error dialog's spinner. */
  isFetching: boolean
  /** The quiz had to reuse questions the player has already seen. */
  repeats: boolean
}

export function useQuizSession(
  effectiveConfig: QuizConfig | null,
): QuizSessionResult {
  const store = useQuizSessionStore()
  const prevConfigRef = useRef<string | null>(null)
  // A session already in the store (restored after a reload, or resumed)
  // has its questions: skip the fetch and its error dialog.
  const hasSession = store.questions.length > 0
  const providerId = useProviderStore((s) => s.providerId)
  const [repeats, setRepeats] = useState(false)
  const query = useQuizQuestions(hasSession ? null : effectiveConfig)
  const { data, error } = query
  const questions = data?.questions

  useEffect(() => {
    if (!questions || !effectiveConfig) return
    if (store.questions.length > 0) return

    const configKey = `${effectiveConfig.category}-${effectiveConfig.difficulty}-${effectiveConfig.questionCount}-${effectiveConfig.mode}`
    if (prevConfigRef.current === configKey) return
    prevConfigRef.current = configKey

    store.reset()
    store.loadQuestions(questions, effectiveConfig, data?.total, {
      start: data?.poolStart ?? 0,
      consumed: data?.poolConsumed ?? 0,
    })
    // The next quiz of this kind continues where this one stopped.
    if (data && getProvider(providerId).paging === 'cursor') {
      useCursorStore
        .getState()
        .setCursor(
          cursorKey(
            providerId,
            effectiveConfig.category,
            effectiveConfig.difficulty,
          ),
          data.nextCursor,
        )
    }
    setRepeats(data?.repeats ?? false)

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
    repeats,
  }
}
