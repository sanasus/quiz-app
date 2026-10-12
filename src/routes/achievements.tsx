/**
 * /achievements — Achievements screen.
 */

import { createFileRoute } from '@tanstack/react-router'
import { AchievementsScreen } from '../views/achievements-screen'

export const Route = createFileRoute('/achievements')({
  component: AchievementsScreen,
})
