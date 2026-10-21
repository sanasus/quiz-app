/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { QuizScreen } from '../views/quiz-screen'
import {
  isSessionActive,
  useQuizSessionStore,
} from '../shared/lib/session-store'
import type { QuizConfig } from '../shared/types/quiz'
import { quizConfigSchema } from '../shared/lib/quiz-config-schema'

function sameConfig(a: QuizConfig, b: QuizConfig): boolean {
  return (
    a.category === b.category &&
    a.difficulty === b.difficulty &&
    a.questionCount === b.questionCount &&
    a.mode === b.mode
  )
}

export const Route = createFileRoute('/quiz')({
  // Guard: no valid config in the URL → back to setup. Runs before the
  // screen renders, including on direct URL entry.
  beforeLoad: ({ search }) => {
    const parsed = quizConfigSchema.safeParse(search)
    if (!parsed.success) {
      throw redirect({ to: '/setup' })
    }
    // Entering /quiz with a finished session still in the store (home
    // "repeat last", back from results) starts a fresh run instead of
    // bouncing to the old results.
    const store = useQuizSessionStore.getState()
    if (store.status === 'finished') store.reset()
    // A stored in-progress run for a different config (stale URL, old
    // history entry) is not this run — drop it. The same config is a
    // reload/resume and keeps its progress.
    if (
      isSessionActive(store.status) &&
      !sameConfig(store.config, parsed.data)
    ) {
      store.reset()
    }
  },
  component: QuizScreen,
})
