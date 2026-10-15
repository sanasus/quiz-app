/**
 * URL construction for the questions endpoint — survival batch loading
 * silently depends on `offset` reaching the live API (a regression
 * there ends every run at the first batch), which is what this pins.
 */

import { describe, expect, it } from 'vitest'
import {
  buildQuestionsUrl,
  getInitialFetchLimit,
  SURVIVAL_BATCH_SIZE,
} from './quizapi-client'
import { retryQuestions } from './quizapi'
import { QuizApiError } from './errors'
import type { ErrorKind } from './errors'
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
})

describe('buildQuestionsUrl', () => {
  it('paginates by offset so batches fetch distinct slices', () => {
    const params = new URL(
      buildQuestionsUrl(survivalConfig, { limit: 10, offset: 10 }),
    ).searchParams

    expect(params.get('limit')).toBe('10')
    expect(params.get('offset')).toBe('10')
    expect(params.get('difficulty')).toBe('EASY')
    expect(params.get('random')).toBe('true')
  })

  it('defaults to offset 0 and the initial fetch limit', () => {
    const params = new URL(buildQuestionsUrl(classicConfig)).searchParams

    expect(params.get('offset')).toBe('0')
    expect(params.get('limit')).toBe('5')
  })

  it('passes the category only when one is selected', () => {
    expect(
      new URL(buildQuestionsUrl(classicConfig)).searchParams.get('category'),
    ).toBeNull()

    const withCategory = new URL(
      buildQuestionsUrl({ ...classicConfig, category: 'javascript' }),
    ).searchParams
    expect(withCategory.get('category')).toBe('javascript')
  })
})

describe('retryQuestions', () => {
  function apiError(kind: ErrorKind): QuizApiError {
    return new QuizApiError('boom', { kind, providerId: 'quizapi' })
  }

  it('retries connectivity failures for the first two attempts', () => {
    expect(retryQuestions(0, apiError('network'))).toBe(true)
    expect(retryQuestions(1, apiError('network'))).toBe(true)
    expect(retryQuestions(2, apiError('network'))).toBe(false)
  })

  it('never retries a timeout — a hung provider must fail fast', () => {
    // No 2×10s wait: the dialog / auto-switch offers a provider
    // change right away (HAR-verified hangs past REQUEST_TIMEOUT_MS).
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
