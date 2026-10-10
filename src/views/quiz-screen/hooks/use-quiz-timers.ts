import { useEffect, useRef } from 'react'
import { useQuizSessionStore, getBlitzTimeLimit } from '../../../shared/lib/session-store'

export function useQuizTimers(effectiveConfig: { mode: string; questionCount: number } | null) {
  const store = useQuizSessionStore()
  const timerStartedRef = useRef(false)
  const sessionStartTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = Date.now()
    }
  }, [])

  // Timed mode: per-question countdown
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

    const limit = store.timeRemaining
    if (limit === undefined || limit === null) return

    timerStartedRef.current = true

    const interval = setInterval(() => {
      const current = useQuizSessionStore.getState()
      const remaining = current.timeRemaining
      if (remaining === undefined || remaining <= 1) {
        clearInterval(interval)
        timerStartedRef.current = false
        current.timeUp()
        return
      }
      current.timerTick()
    }, 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.status])

  // Blitz mode: track elapsed time
  useEffect(() => {
    if (!effectiveConfig || effectiveConfig.mode !== 'blitz') return
    if (store.status !== 'playing') return

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - sessionStartTimeRef.current!) / 1000,
      )
      const limit = getBlitzTimeLimit(effectiveConfig.questionCount)
      if (elapsed >= limit) {
        clearInterval(interval)
        store.timeUp()
      } else {
        store.setBlitzTimeElapsed(elapsed)
      }
    }, 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveConfig, store.status])
}
