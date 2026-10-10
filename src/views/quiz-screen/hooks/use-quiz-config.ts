import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { quizConfigSchema } from '../../../routes/-index'
import type { QuizConfig } from '../../../shared/types/quiz'

export interface QuizConfigResult {
  effectiveConfig: QuizConfig | null
  needsRedirect: boolean
}

export function useQuizConfig(): QuizConfigResult {
  const navigate = useNavigate()
  const search = useSearch({ from: '/quiz' })
  const configResult = quizConfigSchema.safeParse(search)
  const config = configResult.success ? configResult.data : null
  const store = useQuizSessionStore()

  const effectiveConfig = config ?? store.repeatConfig

  if (!effectiveConfig) {
    navigate({ to: '/setup' })
    return { effectiveConfig: null, needsRedirect: true }
  }

  return { effectiveConfig, needsRedirect: false }
}
