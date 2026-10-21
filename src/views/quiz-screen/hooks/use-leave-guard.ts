import { useBlocker } from '@tanstack/react-router'
import { useQuizSessionStore } from '../../../shared/lib/session-store'

/** Statuses where leaving the screen throws away answered questions. */
function inProgress(): boolean {
  const { status } = useQuizSessionStore.getState()
  return status === 'playing' || status === 'answered'
}

export interface LeaveGuard {
  /** A navigation is waiting for the player's decision. */
  open: boolean
  /** Abandon the run and let the navigation through. */
  leave: () => void
  /** Stay on the quiz. */
  stay: () => void
}

/**
 * Confirms before leaving /quiz mid-run (router navigation) and arms the
 * browser's `beforeunload` prompt for tab close / reload.
 *
 * Reads the store imperatively so a run that has just finished — or one
 * the app itself resets before navigating (provider switch) — is not
 * blocked.
 */
export function useLeaveGuard(): LeaveGuard {
  const blocker = useBlocker({
    shouldBlockFn: inProgress,
    enableBeforeUnload: inProgress,
    withResolver: true,
  })

  return {
    open: blocker.status === 'blocked',
    leave: () => {
      useQuizSessionStore.getState().reset()
      blocker.proceed?.()
    },
    stay: () => blocker.reset?.(),
  }
}
