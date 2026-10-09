import { createFileRoute } from '@tanstack/react-router'
import { SetupStub } from './-index.tsx'

export const Route = createFileRoute('/setup')({
  component: SetupStub,
})
