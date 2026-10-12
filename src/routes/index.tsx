/**
 * / — Home screen.
 */

import { createFileRoute } from '@tanstack/react-router'
import { HomeScreen } from '../views/home-screen'

export const Route = createFileRoute('/')({
  component: HomeScreen,
})
