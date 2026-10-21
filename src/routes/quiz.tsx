/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { QuizScreen } from '../views/quiz-screen'
import { useQuizSessionStore } from '../shared/lib/session-store'
import { quizConfigSchema } from '../shared/lib/quiz-config-schema'

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
  },
  component: QuizScreen,
})
