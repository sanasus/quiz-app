import { createFileRoute } from '@tanstack/react-router'
import { ResultsStub } from './-index.tsx'

export const Route = createFileRoute('/results')({
  component: ResultsStub,
})
