/**
 * QuizAPI adapter (adapt-quizapi.ts) — ported from the frontend's
 * adapter.test.ts so live behaviour is provably unchanged.
 */

import { describe, expect, it } from 'vitest'
import { adaptQuestion } from './adapt-quizapi'
import type { QuizApiQuestion } from './quizapi.schemas'

/** Minimal valid fixture (array-of-answers browse format). */
function makeFixture(
  overrides: Partial<QuizApiQuestion> = {},
): QuizApiQuestion {
  return {
    id: 'q1',
    text: 'What is 2+2?',
    difficulty: 'EASY',
    answers: [
      { id: 'a1', text: '3', isCorrect: false },
      { id: 'a2', text: '4', isCorrect: true },
      { id: 'a3', text: '5', isCorrect: false },
      { id: 'a4', text: '6', isCorrect: false },
    ],
    explanation: '2 + 2 = 4',
    ...overrides,
  }
}

describe('adaptQuestion', () => {
  it('adapts single correct answer', () => {
    const result = adaptQuestion(makeFixture())

    expect(result).not.toBeNull()
    expect(result!.id).toBe('q1')
    expect(result!.text).toBe('What is 2+2?')
    expect(result!.correctOptionIds).toEqual(['a2'])
    expect(result!.options.length).toBe(4)
    expect(result!.difficulty).toBe('easy')
  })

  it('drops questions with several correct answers', () => {
    const result = adaptQuestion(
      makeFixture({
        id: 'q2',
        text: 'Select all primes',
        difficulty: 'MEDIUM',
        answers: [
          { id: 'a1', text: '2', isCorrect: true },
          { id: 'a2', text: '4', isCorrect: true },
          { id: 'a3', text: '6', isCorrect: false },
          { id: 'a4', text: '8', isCorrect: false },
        ],
      }),
    )

    expect(result).toBeNull()
  })

  it('returns null when no correct answer', () => {
    const result = adaptQuestion(
      makeFixture({
        id: 'q3',
        answers: [
          { id: 'a1', text: '3', isCorrect: false },
          { id: 'a2', text: '5', isCorrect: false },
          { id: 'a3', text: '6', isCorrect: false },
        ],
      }),
    )
    expect(result).toBeNull()
  })

  it('returns null when only 1 option', () => {
    const result = adaptQuestion(
      makeFixture({
        id: 'q4',
        answers: [{ id: 'a1', text: 'Only option', isCorrect: true }],
      }),
    )
    expect(result).toBeNull()
  })

  it('preserves explanation and description', () => {
    const result = adaptQuestion(
      makeFixture({
        id: 'q5',
        description: 'A simple question',
        explanation: 'The answer is 4 because...',
      }),
    )

    expect(result).not.toBeNull()
    expect(result!.description).toBe('A simple question')
    expect(result!.explanation).toBe('The answer is 4 because...')
  })

  it('maps null description and explanation to undefined', () => {
    const result = adaptQuestion(
      makeFixture({ id: 'q6', description: null, explanation: null }),
    )

    expect(result).not.toBeNull()
    expect(result!.description).toBeUndefined()
    expect(result!.explanation).toBeUndefined()
  })

  it('maps difficulty correctly', () => {
    const map = (diff: 'EASY' | 'MEDIUM' | 'HARD'): string =>
      adaptQuestion(makeFixture({ difficulty: diff }))!.difficulty

    expect(map('EASY')).toBe('easy')
    expect(map('MEDIUM')).toBe('medium')
    expect(map('HARD')).toBe('hard')
  })
})
