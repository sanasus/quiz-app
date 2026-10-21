import { useEffect, useState } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { useQuizQuestions } from '../../../shared/api/quizapi'
import { trackRunStarted } from '../../../shared/analytics/run-events'
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
  // Selectors only: a subscription to the whole store would re-render
  // this hook on every timer tick.
  // A session already in the store (restored after a reload, or resumed)
  // has its questions: skip the fetch and its error dialog.
  const hasSession = useQuizSessionStore((s) => s.questions.length > 0)
  const providerId = useProviderStore((s) => s.providerId)
  const [repeats, setRepeats] = useState(false)
  const query = useQuizQuestions(hasSession ? null : effectiveConfig)
  const { data, error } = query
  const questions = data?.questions

  useEffect(() => {
    if (!questions || !effectiveConfig) return
    // Read the live store, not a render-time copy: this is what keeps a
    // StrictMode re-run (or a second delivery of the same data) from
    // loading twice, and — unlike a "seen this config" ref — it lets the
    // quiz load again if the session was reset while this screen stayed.
    const store = useQuizSessionStore.getState()
    if (store.questions.length > 0) return

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
    trackRunStarted(data?.repeats ?? false)

    store.startPlaying()
    store.startSessionTimer()
    // `data` and `providerId` ride along with `questions` (one query result
    // per provider); re-running on them would only repeat the early return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, effectiveConfig])

  const currentQuestion: Question | null = useQuizSessionStore(
    (s) => s.questions[s.currentIndex] ?? null,
  )

  return {
    currentQuestion,
    loadingState: currentQuestion ? 'ready' : 'loading',
    error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    repeats,
  }
}
