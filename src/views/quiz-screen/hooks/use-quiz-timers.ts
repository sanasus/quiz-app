import { useEffect, useRef } from 'react'
import { useQuizSessionStore, getBlitzTimeLimit } from '../../../shared/lib/session-store'

export function useQuizTimers(effectiveConfig: { mode: string; questionCount: number } | null) {
  const store = useQuizSessionStore()
  const timerStartedRef = useRef(false)

  // Timed mode: per-question countdown (10 seconds per question)
  useEffect(() => {
    if (!effectiveConfig || effectiveConfig.mode !== 'timed') {
      timerStartedRef.current = false
      return
    }
    if (store.status !== 'playing') {
      timerStartedRef.current = false
      return
    }
    if (timerStartedRef.current) return

    const limit = 10 // per-question limit for timed mode
    store.startTimer(limit)
    timerStartedRef.current = true

    const interval = setInterval(() => {
      const current = useQuizSessionStore.getState()
      const remaining = current.timeRemaining
      if (remaining === undefined || remaining <= 1) {
        clearInterval(interval)
        // Guard against unmount between clearInterval and timeUp
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
  }, [store.status])

  // Blitz mode: per-question countdown (10 seconds per question)
  // Uses the same timerTick pattern as timed mode, but timeUp() resets
  // the timer instead of ending the session.
  useEffect(() => {
    if (!effectiveConfig || effectiveConfig.mode !== 'blitz') return
    if (store.status !== 'playing') return
    if (timerStartedRef.current) return

    const limit = getBlitzTimeLimit(effectiveConfig.questionCount)
    store.startTimer(limit)
    timerStartedRef.current = true

    const interval = setInterval(() => {
      const current = useQuizSessionStore.getState()
      const remaining = current.timeRemaining
      if (remaining === undefined || remaining <= 1) {
        clearInterval(interval)
        // Guard against unmount between clearInterval and timeUp
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
  }, [store.status])
}
