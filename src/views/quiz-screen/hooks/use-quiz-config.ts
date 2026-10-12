import { useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { quizConfigSchema } from '../../../shared/lib/quiz-config-schema'
import type { QuizConfig } from '../../../shared/types/quiz'

export interface QuizConfigResult {
  effectiveConfig: QuizConfig | null
}

export function useQuizConfig(): QuizConfigResult {
  const search = useSearch({ from: '/quiz' })
  const repeatConfig = useQuizSessionStore((s) => s.repeatConfig)

  // Parse once per `search` change so `effectiveConfig` stays
  // referentially stable — downstream effect deps don't churn per render.
  const config = useMemo(() => {
    const parsed = quizConfigSchema.safeParse(search)
    return parsed.success ? parsed.data : null
  }, [search])

  // Invalid config without a repeat session never renders: the route's
  // beforeLoad guard redirects to /setup first.
  return { effectiveConfig: config ?? repeatConfig }
}
