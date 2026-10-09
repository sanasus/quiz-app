import { createFileRoute } from '@tanstack/react-router'
import { AchievementsStub } from './-index.tsx'

export const Route = createFileRoute('/achievements')({
  component: AchievementsStub,
})
