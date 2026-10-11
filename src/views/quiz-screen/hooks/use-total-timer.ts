import { useEffect, useRef } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { getMode } from '../../../features/modes'
import type { QuizMode } from '../../../shared/types/quiz'

export function useTotalTimer(effectiveConfig: { mode: string; questionCount: number } | null) {
  const store = useQuizSessionStore()
  const startedSessionRef = useRef<string | null>(null)

  // Reset "started" flag when config changes (new session)
  const sessionKey = effectiveConfig ? `${effectiveConfig.mode}-${effectiveConfig.questionCount}` : null
  if (startedSessionRef.current !== sessionKey) {
    startedSessionRef.current = sessionKey
    // Will be set below if needed
  }

  useEffect(() => {
    if (!effectiveConfig) return

    const mode = getMode(effectiveConfig.mode as QuizMode)

    // Only total-timer modes need this effect
    if (mode.timerBehavior !== 'total') return

    // Timer already running?
    if (store.timeRemaining !== undefined) return

    const rawLimit = mode.timerLimit
    const timeLimit = typeof rawLimit === 'function'
      ? rawLimit(effectiveConfig.questionCount)
      : rawLimit

    if (timeLimit === null) return

    store.startTimer(timeLimit)

    const interval = setInterval(() => {
      const current = useQuizSessionStore.getState()
      const remaining = current.timeRemaining
      if (remaining === undefined || remaining <= 1) {
        clearInterval(interval)
        current.timeUp()
        return
      }
      current.timerTick()
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveConfig?.mode])
}
