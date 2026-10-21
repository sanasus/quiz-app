import { useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import { quizConfigSchema } from '../../../shared/lib/quiz-config-schema'
import type { QuizConfig } from '../../../shared/types/quiz'

export interface QuizConfigResult {
  effectiveConfig: QuizConfig | null
}

export function useQuizConfig(): QuizConfigResult {
  const search = useSearch({ from: '/quiz' })

  // Parse once per `search` change so `effectiveConfig` stays
  // referentially stable — downstream effect deps don't churn per render.
  const config = useMemo(() => {
    const parsed = quizConfigSchema.safeParse(search)
    return parsed.success ? parsed.data : null
  }, [search])

  // An invalid config never renders: the route's beforeLoad guard
  // redirects to /setup first.
  return { effectiveConfig: config }
}
