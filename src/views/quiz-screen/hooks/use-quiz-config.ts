import { useEffect, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { quizConfigSchema } from '../../../shared/lib/quiz-config-schema'
import type { QuizConfig } from '../../../shared/types/quiz'

export interface QuizConfigResult {
  effectiveConfig: QuizConfig | null
  needsRedirect: boolean
}

export function useQuizConfig(): QuizConfigResult {
  const navigate = useNavigate()
  const search = useSearch({ from: '/quiz' })
  const repeatConfig = useQuizSessionStore((s) => s.repeatConfig)

  // Parse once per `search` change so `effectiveConfig` stays
  // referentially stable — downstream effect deps don't churn per render.
  const config = useMemo(() => {
    const parsed = quizConfigSchema.safeParse(search)
    return parsed.success ? parsed.data : null
  }, [search])

  const effectiveConfig = config ?? repeatConfig
  const needsRedirect = effectiveConfig === null

  // Navigation is a side effect — never do it during render.
  useEffect(() => {
    if (needsRedirect) navigate({ to: '/setup' })
  }, [needsRedirect, navigate])

  return { effectiveConfig, needsRedirect }
}
