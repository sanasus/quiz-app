/**
 * /results — Session results with score, accuracy, and repeat-mistakes.
 */

import { createFileRoute } from '@tanstack/react-router'
import { ResultsScreen } from '../views/results-screen'

export const Route = createFileRoute('/results')({
  component: ResultsScreen,
})
