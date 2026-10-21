/**
 * Quiz-run events built from the live session store, so the call sites
 * (session start, finish, leaving) stay one-liners.
 */

import { useProviderStore } from '../api/provider-store'
import { checkAnswer } from '../lib/answers'
import { useQuizSessionStore } from '../lib/session-store'
import { track } from './analytics'
import type { RunProps } from './events'

function runProps(): RunProps {
  const { config } = useQuizSessionStore.getState()
  return {
    mode: config.mode,
    difficulty: config.difficulty,
    category: config.category,
    provider: useProviderStore.getState().providerId,
  }
}

export function trackRunStarted(repeats: boolean): void {
  track('quiz_started', { ...runProps(), repeats })
}

export function trackRunFinished(
  summary: { correct: number; total: number; score: number },
  abandoned = false,
): void {
  track('quiz_finished', { ...runProps(), abandoned, ...summary })
}

/** The player gave up a run in progress (confirmed leave, «start over»). */
export function trackRunAbandoned(): void {
  const state = useQuizSessionStore.getState()
  if (state.status !== 'playing' && state.status !== 'answered') return

  // Questions up to the current one, the current one only once answered.
  const answered =
    state.status === 'answered' ? state.currentIndex + 1 : state.currentIndex
  let correct = 0
  for (const question of state.questions.slice(0, answered)) {
    const selected = state.answers[question.id] ?? []
    if (checkAnswer(question.correctOptionIds, selected)) correct++
  }
  trackRunFinished({ correct, total: answered, score: state.score }, true)
}
