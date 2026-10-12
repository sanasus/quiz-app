import { useEffect } from 'react'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { startTimerInterval } from '../utils/timer-interval'
import { getMode } from '../../../features/modes'
import type { QuizMode } from '../../../shared/types/quiz'

export function useTotalTimer(
  effectiveConfig: { mode: string; questionCount: number } | null,
) {
  const store = useQuizSessionStore()

  useEffect(() => {
    if (!effectiveConfig) return

    const mode = getMode(effectiveConfig.mode as QuizMode)

    // Only total-timer modes need this effect
    if (mode.timerBehavior !== 'total') return

    // Wait until questions are loaded: LOAD_QUESTIONS clears
    // `timeRemaining`, so a timer started at mount would read `undefined`
    // on its next tick and instantly fire timeUp — ending the session
    // before it even starts.
    if (store.questions.length === 0) return

    // Already counting down? Keep ticking. Only start when the countdown
    // is missing (fresh session or remount with a preserved countdown).
    if (store.timeRemaining === undefined) {
      const rawLimit = mode.timerLimit
      const timeLimit =
        typeof rawLimit === 'function'
          ? rawLimit(effectiveConfig.questionCount)
          : rawLimit

      if (timeLimit === null) return

      store.startTimer(timeLimit)
    }

    return startTimerInterval(() => true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveConfig?.mode, store.questions.length])
}
