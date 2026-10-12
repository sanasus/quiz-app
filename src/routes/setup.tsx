/**
 * /setup — Quiz configuration screen.
 */

import { createFileRoute } from '@tanstack/react-router'
import { SetupScreen } from '../views/setup-screen'

export const Route = createFileRoute('/setup')({
  component: SetupScreen,
})
