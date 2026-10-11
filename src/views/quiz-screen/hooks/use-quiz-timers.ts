import { useEffect, useRef } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { getMode } from '../../../features/modes'
import type { QuizMode } from '../../../shared/types/quiz'

export function useQuizTimers(effectiveConfig: { mode: string; questionCount: number } | null) {
  const store = useQuizSessionStore()
  const timerStartedRef = useRef(false)

  useEffect(() => {
    if (!effectiveConfig) {
      timerStartedRef.current = false
      return
    }

    const mode = getMode(effectiveConfig.mode as QuizMode)

    // Only per-question timer modes need this effect
    if (mode.timerBehavior !== 'per-question') {
      timerStartedRef.current = false
      return
    }

    const rawLimit = mode.timerLimit
    const timeLimit = typeof rawLimit === 'function'
      ? rawLimit(effectiveConfig.questionCount)
      : rawLimit

    if (timeLimit === null) {
      timerStartedRef.current = false
      return
    }

    if (store.status !== 'playing') {
      timerStartedRef.current = false
      return
    }

    if (timerStartedRef.current) return

    store.startTimer(timeLimit)
    timerStartedRef.current = true

    const interval = setInterval(() => {
      const current = useQuizSessionStore.getState()
      const remaining = current.timeRemaining
      if (remaining === undefined || remaining <= 1) {
        clearInterval(interval)
        if (!timerStartedRef.current) return
        timerStartedRef.current = false
        current.timeUp()
        return
      }
      current.timerTick()
    }, 1000)

    return () => {
      clearInterval(interval)
      timerStartedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.status, effectiveConfig?.mode])
}
