import { useEffect, useRef } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { useQuizQuestions } from '../../../shared/api/quizapi'
import type { QuizConfig, Question } from '../../../shared/types/quiz'

export interface QuizSessionResult {
  store: ReturnType<typeof useQuizSessionStore>
  effectiveConfig: QuizConfig | null
  currentQuestion: Question | null
  loadingState: 'loading' | 'ready'
  error: Error | null
}

export function useQuizSession(effectiveConfig: QuizConfig | null): QuizSessionResult {
  const store = useQuizSessionStore()
  const prevConfigRef = useRef<string | null>(null)
  const { data: questions, error } = useQuizQuestions(effectiveConfig)

  useEffect(() => {
    if (!questions || !effectiveConfig) return
    if (store.questions.length > 0) return

    const configKey = `${effectiveConfig.category}-${effectiveConfig.difficulty}-${effectiveConfig.questionCount}-${effectiveConfig.mode}`
    if (prevConfigRef.current === configKey) return
    prevConfigRef.current = configKey

    store.reset()
    store.loadQuestions(questions, effectiveConfig)

    store.startPlaying()
    store.startSessionTimer()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, effectiveConfig, store.questions.length])

  const currentQuestion = store.questions[store.currentIndex]

  if (!currentQuestion) {
    return {
      store,
      effectiveConfig,
      currentQuestion: null,
      loadingState: 'loading',
      error: null,
    }
  }

  return {
    store,
    effectiveConfig,
    currentQuestion,
    loadingState: 'ready',
    error,
  }
}
