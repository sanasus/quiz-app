/**
 * /results — Session results with score, accuracy, and the list of mistakes.
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { ResultsScreen } from '../views/results-screen'
import { useQuizSessionStore } from '../shared/lib/session-store'

export const Route = createFileRoute('/results')({
  // Guard: only a finished session may show results — covers direct URL
  // entry and reloads (the store resets to idle on page load).
  beforeLoad: () => {
    if (useQuizSessionStore.getState().status !== 'finished') {
      throw redirect({ to: '/setup' })
    }
  },
  component: ResultsScreen,
})
