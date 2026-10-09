/**
 * Tests for the adapter (adapter.ts).
 *
 * Covers:
 * - single correct answer
 * - multiple correct answers
 * - broken data: no correct answer
 * - broken data: only 1 option
 */

import { describe, it, expect } from 'vitest'
import { adaptQuestion } from './adapter'
import type { QuizApiQuestion } from './schemas'

// Helper: minimal valid fixture (new array-of-answers format)
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
    const fixture = makeFixture()
    const result = adaptQuestion(fixture)

    expect(result).not.toBeNull()
    expect(result!.id).toBe('q1')
    expect(result!.text).toBe('What is 2+2?')
    expect(result!.multiple).toBe(false)
    expect(result!.correctOptionIds).toEqual(['a2'])
    expect(result!.options.length).toBe(4)
    expect(result!.difficulty).toBe('easy')
  })

  it('adapts multiple correct answers', () => {
    const fixture = makeFixture({
      id: 'q2',
      text: 'Select all primes',
      difficulty: 'MEDIUM',
      answers: [
        { id: 'a1', text: '2', isCorrect: true },
        { id: 'a2', text: '4', isCorrect: true },
        { id: 'a3', text: '6', isCorrect: false },
        { id: 'a4', text: '8', isCorrect: false },
      ],
    })
    const result = adaptQuestion(fixture)

    expect(result).not.toBeNull()
    expect(result!.multiple).toBe(true)
    expect(result!.correctOptionIds).toEqual(['a1', 'a2'])
  })

  it('returns null when no correct answer', () => {
    const fixture = makeFixture({
      id: 'q3',
      answers: [
        { id: 'a1', text: '3', isCorrect: false },
        { id: 'a2', text: '5', isCorrect: false },
        { id: 'a3', text: '6', isCorrect: false },
        { id: 'a4', text: '7', isCorrect: false },
      ],
    })
    const result = adaptQuestion(fixture)
    expect(result).toBeNull()
  })

  it('returns null when only 1 option', () => {
    const fixture = makeFixture({
      id: 'q4',
      answers: [{ id: 'a1', text: 'Only option', isCorrect: true }],
    })
    const result = adaptQuestion(fixture)
    expect(result).toBeNull()
  })

  it('preserves explanation and description', () => {
    const fixture = makeFixture({
      id: 'q5',
      description: 'A simple question',
      explanation: 'The answer is 4 because...',
    })
    const result = adaptQuestion(fixture)

    expect(result).not.toBeNull()
    expect(result!.description).toBe('A simple question')
    expect(result!.explanation).toBe('The answer is 4 because...')
  })

  it('handles null description and explanation', () => {
    const fixture = makeFixture({
      id: 'q6',
      description: null,
      explanation: null,
    })
    const result = adaptQuestion(fixture)

    expect(result).not.toBeNull()
    expect(result!.description).toBeUndefined()
    expect(result!.explanation).toBeUndefined()
  })

  it('maps difficulty correctly', () => {
    const mapDifficulty = (
      diff: 'EASY' | 'MEDIUM' | 'HARD',
    ): 'easy' | 'medium' | 'hard' => {
      const r = adaptQuestion(makeFixture({ difficulty: diff }))
      return r!.difficulty
    }

    expect(mapDifficulty('EASY')).toBe('easy')
    expect(mapDifficulty('MEDIUM')).toBe('medium')
    expect(mapDifficulty('HARD')).toBe('hard')
  })
})
