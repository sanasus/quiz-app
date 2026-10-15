import { useEffect, useRef } from 'react'
import { useQuestionBatch } from '../../../shared/api/quizapi'
import type { QuestionsPage } from '../../../shared/api/providers'
import {
  canLoadMoreQuestions,
  useQuizSessionStore,
} from '../../../shared/lib/session-store'
import type { QuizConfig } from '../../../shared/types/quiz'

/** Start fetching the next batch when this many loaded questions remain. */
const PREFETCH_THRESHOLD = 2

export interface QuestionFeedResult {
  /** The next batch is still loading — Next must wait for it. */
  waitingForBatch: boolean
  /**
   * The next batch failed to load: the run cannot advance past the
   * loaded pool until it is retried or abandoned. Null otherwise.
   */
  batchError: string | null
  /** Retry the failed batch fetch. */
  retryBatch: () => void
  /** A batch refetch is in flight — drives the error dialog's spinner. */
  isFetching: boolean
  /**
   * Give up on further batches and finish the run — the escape hatch
   * for errors a retry cannot fix (e.g. an invalid API key).
   */
  finishWithoutBatch: () => void
}

/**
 * Survival batch loading: prefetches the next question batch as the
 * user approaches the end of the loaded pool and appends it to the
 * session. A batch with nothing new marks the pool exhausted, which
 * lets the session-end logic finish honestly. A *failed* batch is
 * surfaced to the UI instead — a rate limit or network blip must not
 * end the run as if the questions ran out.
 */
export function useQuestionFeed(config: QuizConfig | null): QuestionFeedResult {
  const status = useQuizSessionStore((s) => s.status)
  const currentIndex = useQuizSessionStore((s) => s.currentIndex)
  const loaded = useQuizSessionStore((s) => s.questions.length)
  const lives = useQuizSessionStore((s) => s.lives)
  const canLoadMore = useQuizSessionStore(canLoadMoreQuestions)
  const appendQuestions = useQuizSessionStore((s) => s.appendQuestions)
  const markQuestionsExhausted = useQuizSessionStore(
    (s) => s.markQuestionsExhausted,
  )

  const sessionActive = status === 'playing' || status === 'answered'
  const shouldFetch =
    canLoadMore &&
    sessionActive &&
    loaded > 0 &&
    currentIndex >= loaded - PREFETCH_THRESHOLD

  const { data, error, refetch, isFetching } = useQuestionBatch(
    config,
    loaded,
    shouldFetch,
  )

  // StrictMode re-runs effects on mount: without this guard an
  // already-resolved batch would be appended twice, and the second
  // (fully duplicated) pass would wrongly mark the pool exhausted.
  const processedRef = useRef<QuestionsPage | undefined>(undefined)

  // Gated on `shouldFetch`: a disabled query still returns cached data
  // for its key, which must not spill into the session early.
  useEffect(() => {
    if (!shouldFetch) return
    if (!data || processedRef.current === data) return
    processedRef.current = data
    appendQuestions(data.questions, data.total)
  }, [shouldFetch, data, appendQuestions])

  // At the last loaded question, Next waits for the pending batch —
  // unless the run is already over (0 lives), where Next finishes it.
  const waitingForBatch =
    status === 'answered' &&
    canLoadMore &&
    lives > 0 &&
    currentIndex >= loaded - 1

  // Only relevant while the run is actually blocked on the batch.
  const batchError = waitingForBatch && error ? error.message : null

  return {
    waitingForBatch,
    batchError,
    retryBatch: refetch,
    isFetching,
    finishWithoutBatch: markQuestionsExhausted,
  }
}
