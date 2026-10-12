import { useEffect, useRef } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { startTimerInterval } from '../utils/timer-interval'
import { getMode } from '../../../features/modes'
import type { QuizMode } from '../../../shared/types/quiz'

export function useQuizTimers(
  effectiveConfig: { mode: string; questionCount: number } | null,
) {
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
    const timeLimit =
      typeof rawLimit === 'function'
        ? rawLimit(effectiveConfig.questionCount)
        : rawLimit

    if (timeLimit === null || store.status !== 'playing') {
      timerStartedRef.current = false
      return
    }

    if (timerStartedRef.current) return

    store.startTimer(timeLimit)
    timerStartedRef.current = true

    return startTimerInterval(() => timerStartedRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.status, effectiveConfig?.mode])
}
