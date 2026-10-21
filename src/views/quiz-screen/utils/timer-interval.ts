/**
 * Shared 1-second interval for quiz timers.
 *
 * Ticks the session store until time runs out, then fires `timeUp`.
 * `isActive` lets the owning effect cancel a stale tick that was already
 * queued when the effect cleaned up (prevents a duplicate `timeUp`).
 *
 * The clock only runs while a question is being answered: while the
 * result is shown (`answered`) ticks are skipped, so the shared timer of
 * timed mode pauses with the pause on the answer.
 */
import { useQuizSessionStore } from '../../../shared/lib/session-store'

export function startTimerInterval(isActive: () => boolean): () => void {
  const interval = setInterval(() => {
    const state = useQuizSessionStore.getState()
    if (state.status === 'answered') return
    const remaining = state.timeRemaining
    if (remaining === undefined || remaining <= 1) {
      clearInterval(interval)
      if (!isActive()) return
      state.timeUp()
      return
    }
    state.timerTick()
  }, 1000)

  return () => clearInterval(interval)
}
