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

// Helper: minimal valid fixture
function makeFixture(
  overrides: Partial<QuizApiQuestion> = {},
): QuizApiQuestion {
  return {
    id: 1,
    question: 'What is 2+2?',
    description: null,
    answers: {
      answer_a: '3',
      answer_b: '4',
      answer_c: '5',
      answer_d: '6',
    },
    multiple_correct_answers: 'false',
    correct_answers: {
      answer_a_correct: 'false',
      answer_b_correct: 'true',
      answer_c_correct: 'false',
      answer_d_correct: 'false',
    },
    explanation: '2 + 2 = 4',
    tip: null,
    tags: [{ name: 'Math' }],
    category: 'Math',
    difficulty: 'Easy',
    ...overrides,
  }
}

describe('adaptQuestion', () => {
  it('adapts single correct answer', () => {
    const fixture = makeFixture()
    const result = adaptQuestion(fixture)

    expect(result).not.toBeNull()
    expect(result!.id).toBe('1')
    expect(result!.text).toBe('What is 2+2?')
    expect(result!.multiple).toBe(false)
    expect(result!.correctOptionIds).toEqual(['answer_b'])
    expect(result!.options.length).toBe(4)
    expect(result!.difficulty).toBe('easy')
  })

  it('adapts multiple correct answers', () => {
    const fixture = makeFixture({
      id: 2,
      question: 'Select all primes',
      multiple_correct_answers: 'true',
      correct_answers: {
        answer_a_correct: 'true',
        answer_b_correct: 'true',
        answer_c_correct: 'false',
        answer_d_correct: 'false',
      },
    })
    const result = adaptQuestion(fixture)

    expect(result).not.toBeNull()
    expect(result!.multiple).toBe(true)
    expect(result!.correctOptionIds).toEqual(['answer_a', 'answer_b'])
  })

  it('returns null when no correct answer', () => {
    const fixture = makeFixture({
      id: 3,
      correct_answers: {
        answer_a_correct: 'false',
        answer_b_correct: 'false',
        answer_c_correct: 'false',
        answer_d_correct: 'false',
      },
    })
    const result = adaptQuestion(fixture)
    expect(result).toBeNull()
  })

  it('returns null when only 1 option', () => {
    const fixture = makeFixture({
      id: 4,
      answers: { answer_a: 'Only option' },
      correct_answers: { answer_a_correct: 'true' },
    })
    const result = adaptQuestion(fixture)
    expect(result).toBeNull()
  })

  it('preserves explanation and description', () => {
    const fixture = makeFixture({
      id: 5,
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
      id: 6,
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
      diff: 'Easy' | 'Medium' | 'Hard',
    ): 'easy' | 'medium' | 'hard' => {
      const r = adaptQuestion(makeFixture({ difficulty: diff }))
      return r!.difficulty
    }

    expect(mapDifficulty('Easy')).toBe('easy')
    expect(mapDifficulty('Medium')).toBe('medium')
    expect(mapDifficulty('Hard')).toBe('hard')
  })
})
