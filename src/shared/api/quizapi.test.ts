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
} from './quizapi'
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
