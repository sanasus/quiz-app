/**
 * Batch-size policy (fetch-limits.ts) — read by the live client, the
 * mock and the survival hooks, so a drift between them would silently
 * break pool-exhaustion detection.
 */

import { describe, expect, it } from 'vitest'
import { getInitialFetchLimit, SURVIVAL_BATCH_SIZE } from './fetch-limits'
import type { QuizConfig } from '../types/quiz'

const classicConfig: QuizConfig = {
  category: 'all',
  difficulty: 'easy',
  questionCount: 5,
  mode: 'classic',
}

const survivalConfig: QuizConfig = { ...classicConfig, mode: 'survival' }

describe('getInitialFetchLimit', () => {
  it('uses the configured count outside survival', () => {
    expect(getInitialFetchLimit(classicConfig)).toBe(5)
  })

  it('always starts survival with the first batch', () => {
    expect(getInitialFetchLimit(survivalConfig)).toBe(SURVIVAL_BATCH_SIZE)
  })

  it('ignores the configured count in every other mode', () => {
    for (const mode of ['timed', 'blitz'] as const) {
      expect(getInitialFetchLimit({ ...classicConfig, mode })).toBe(
        classicConfig.questionCount,
      )
    }
  })
})

describe('SURVIVAL_BATCH_SIZE', () => {
  it('is 10 — the survival header and prefetch assume it', () => {
    expect(SURVIVAL_BATCH_SIZE).toBe(10)
  })
})
