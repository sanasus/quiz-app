/**
 * /stats — Statistics screen.
 */

import { createFileRoute } from '@tanstack/react-router'
import { StatsScreen } from '../views/stats-screen'

export const Route = createFileRoute('/stats')({
  component: StatsScreen,
})
