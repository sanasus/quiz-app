/**
 * /settings — Settings screen.
 */

import { createFileRoute } from '@tanstack/react-router'
import { SettingsScreen } from '../views/settings-screen'

export const Route = createFileRoute('/settings')({
  component: SettingsScreen,
})
