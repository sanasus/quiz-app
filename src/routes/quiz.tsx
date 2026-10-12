/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { QuizScreen } from '../views/quiz-screen'
import { quizConfigSchema } from '../shared/lib/quiz-config-schema'
import { useQuizSessionStore } from '../shared/lib/session-store'

export const Route = createFileRoute('/quiz')({
  // Guard: no valid config in the URL and no repeat-mistakes session
  // waiting → back to setup. Runs before the screen renders, including
  // on direct URL entry.
  beforeLoad: ({ search }) => {
    const repeatConfig = useQuizSessionStore.getState().repeatConfig
    const parsed = quizConfigSchema.safeParse(search)
    if (!parsed.success && !repeatConfig) {
      throw redirect({ to: '/setup' })
    }
  },
  component: QuizScreen,
})
