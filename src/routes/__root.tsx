/**
 * Root route — mounts the app layout from views/root-layout.
 */

import { createRootRoute } from '@tanstack/react-router'
import { RootLayout } from '../views/root-layout'

export const Route = createRootRoute({
  component: RootLayout,
})
