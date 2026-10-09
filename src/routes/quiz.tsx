import { createFileRoute } from '@tanstack/react-router'
import { QuizStub } from './-index.tsx'

export const Route = createFileRoute('/quiz')({
  component: QuizStub,
})
