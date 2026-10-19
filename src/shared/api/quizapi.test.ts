/**
 * Retry policy (quizapi.ts): which failures TanStack Query may retry.
 *
 * The provider-switch policy keys off the same `kind`s
 * (docs/providers.md): network alone is cheap to retry —
 * anything else must fail fast so the dialog / auto-switch can offer a
 * provider change immediately instead of burning the retry budget.
 */

import { describe, expect, it } from 'vitest'
import { retryQuestions } from './quizapi'
import { QuizApiError } from './errors'
import type { ErrorKind } from './errors'

function apiError(kind: ErrorKind): QuizApiError {
  return new QuizApiError('boom', { kind, providerId: 'quizapi' })
}

describe('retryQuestions', () => {
  it('retries connectivity failures for the first two attempts', () => {
    expect(retryQuestions(0, apiError('network'))).toBe(true)
    expect(retryQuestions(1, apiError('network'))).toBe(true)
    expect(retryQuestions(2, apiError('network'))).toBe(false)
  })

  it('never retries a timeout — a hung provider must fail fast', () => {
    // No 2×15s wait: the dialog / auto-switch offers a provider change
    // right away rather than stalling on a request that already hung.
    expect(retryQuestions(0, apiError('timeout'))).toBe(false)
    expect(retryQuestions(1, apiError('timeout'))).toBe(false)
  })

  it('never retries broken-provider kinds', () => {
    for (const kind of ['auth', 'rate_limit', 'parse', 'http'] as const) {
      expect(retryQuestions(0, apiError(kind))).toBe(false)
    }
  })

  it('retries plain unclassified errors like a network blip', () => {
    expect(retryQuestions(0, new Error('boom'))).toBe(true)
    expect(retryQuestions(1, new Error('boom'))).toBe(true)
    expect(retryQuestions(2, new Error('boom'))).toBe(false)
  })
})
