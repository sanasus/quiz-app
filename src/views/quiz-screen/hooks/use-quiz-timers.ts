import { useEffect, useRef } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { startTimerInterval } from '../utils/timer-interval'
import { getMode } from '../../../features/modes'
import type { QuizMode } from '../../../shared/types/quiz'

export function useQuizTimers(
  effectiveConfig: { mode: string; questionCount: number } | null,
) {
  const status = useQuizSessionStore((s) => s.status)
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

    if (timeLimit === null || status !== 'playing') {
      timerStartedRef.current = false
      return
    }

    if (timerStartedRef.current) return

    // A countdown restored from a reloaded page keeps its saved value;
    // fresh runs (LOAD_QUESTIONS clears it) and new questions (the mode
    // resets it) start from the full limit.
    const store = useQuizSessionStore.getState()
    if (store.timeRemaining === undefined) store.startTimer(timeLimit)
    timerStartedRef.current = true

    return startTimerInterval(() => timerStartedRef.current)
    // Re-arms per status change (a new question) and mode; the question
    // count only matters for the limit read above.
  }, [status, effectiveConfig])
}
