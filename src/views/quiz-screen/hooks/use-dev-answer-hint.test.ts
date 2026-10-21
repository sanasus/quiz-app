/**
 * Tests for the dev-only answer hint (use-dev-answer-hint.ts).
 *
 * Covers:
 * - logs correct answer text when a question becomes visible
 * - answers are highlighted via %c style args (green pill)
 * - logs once per question under StrictMode double-invoked effects
 * - no log for a null question, new log when the question changes
 * - falls back to the option id when it is missing from options
 * - literal % in text is escaped for console.format
 *
 * Assumes a dev-mode Vitest run (`import.meta.env.DEV === true`, the
 * default): in production mode the hook is a no-op and the logging
 * assertions would fail rather than skip.
 */

import { StrictMode } from 'react'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Question } from '../../../shared/types/quiz'
import { CORRECT_ANSWER_STYLE, useDevAnswerHint } from './use-dev-answer-hint'

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    text: 'What is React?',
    options: [
      { id: 'opt1', text: 'A database' },
      { id: 'opt2', text: 'A UI library' },
    ],
    correctOptionIds: ['opt2'],
    difficulty: 'easy',
    ...overrides,
  }
}

const renderHint = (initialQuestion: Question | null) =>
  renderHook(
    ({ question }: { question: Question | null }) => useDevAnswerHint(question),
    { initialProps: { question: initialQuestion } },
  )

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useDevAnswerHint', () => {
  it('logs the correct answer, highlighted with the answer style', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderHint(makeQuestion())

    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(
      '[quiz] q1 «What is React?» → %cA UI library%c (ids: opt2)',
      CORRECT_ANSWER_STYLE,
      '',
    )
  })

  it('logs once under StrictMode (double effect invocation)', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderHook(() => useDevAnswerHint(makeQuestion()), {
      wrapper: StrictMode,
    })

    expect(log).toHaveBeenCalledTimes(1)
  })

  it('does not log while the question is null', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderHint(null)

    expect(log).not.toHaveBeenCalled()
  })

  it('logs a new hint when the question changes', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { rerender } = renderHint(makeQuestion())
    rerender({ question: makeQuestion({ id: 'q2', text: 'Second?' }) })

    expect(log).toHaveBeenCalledTimes(2)
    expect(log).toHaveBeenLastCalledWith(
      '[quiz] q2 «Second?» → %cA UI library%c (ids: opt2)',
      CORRECT_ANSWER_STYLE,
      '',
    )
  })

  it('highlights every correct option for several correct ids', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderHint(makeQuestion({ correctOptionIds: ['opt1', 'opt2'] }))

    expect(log).toHaveBeenCalledWith(
      '[quiz] q1 «What is React?» → %cA database%c, %cA UI library%c ' +
        '(ids: opt1, opt2)',
      CORRECT_ANSWER_STYLE,
      '',
      CORRECT_ANSWER_STYLE,
      '',
    )
  })

  it('falls back to the option id when it is missing from options', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderHint(makeQuestion({ correctOptionIds: ['ghost'] }))

    expect(log).toHaveBeenCalledWith(
      '[quiz] q1 «What is React?» → %cghost%c (ids: ghost)',
      CORRECT_ANSWER_STYLE,
      '',
    )
  })

  it('escapes a literal % so console.format keeps it as-is', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderHint(
      makeQuestion({
        text: 'Is 100% coverage needed?',
        options: [{ id: 'opt1', text: 'Only 50% of it' }],
        correctOptionIds: ['opt1'],
      }),
    )

    expect(log).toHaveBeenCalledWith(
      '[quiz] q1 «Is 100%% coverage needed?» → %cOnly 50%% of it%c (ids: opt1)',
      CORRECT_ANSWER_STYLE,
      '',
    )
  })
})
