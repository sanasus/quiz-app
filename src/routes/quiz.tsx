/**
 * /quiz — Quiz screen with question, options, timer, and scoring.
 */

import { createFileRoute } from '@tanstack/react-router'
import { QuizScreen } from '../views/quiz-screen'

export const Route = createFileRoute('/quiz')({
  component: QuizScreen,
})
