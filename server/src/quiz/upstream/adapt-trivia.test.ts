/**
 * Trivia adapter (adapt-trivia.ts) — ported from the frontend's
 * triviaapi.test.ts. Option order is shuffled, so every assertion
 * compares sorted multisets instead of positions.
 */

import { describe, expect, it } from 'vitest'
import { adaptTriviaQuestion } from './adapt-trivia'
import type { TriviaApiQuestion } from './trivia.schemas'

/** Minimal valid raw trivia question. */
function makeTrivia(
  overrides: Partial<TriviaApiQuestion> = {},
): TriviaApiQuestion {
  return {
    id: 'q1',
    question: { text: 'What is 2+2?' },
    correctAnswer: '4',
    incorrectAnswers: ['3', '5', '6'],
    category: 'Science: Mathematics',
    difficulty: 'easy',
    ...overrides,
  }
}

describe('adaptTriviaQuestion', () => {
  it('adapts a normal 4-option question', () => {
    const raw = makeTrivia()
    const result = adaptTriviaQuestion(raw)

    expect(result).not.toBeNull()
    expect(result!.id).toBe('q1')
    expect(result!.text).toBe('What is 2+2?')
    expect(result!.options.length).toBe(4)
    expect(result!.multiple).toBe(false)
    expect(result!.explanation).toBeUndefined()
    expect(result!.category).toBe('Science: Mathematics')
    expect(result!.difficulty).toBe('easy')
  })

  it('keeps exactly the raw answer texts as options', () => {
    const raw = makeTrivia()
    const result = adaptTriviaQuestion(raw)!

    const expected = [raw.correctAnswer, ...raw.incorrectAnswers].sort()
    const actual = result.options.map((option) => option.text).sort()
    expect(actual).toEqual(expected)
  })

  it('marks exactly one correct option matching the raw answer', () => {
    const raw = makeTrivia()
    const result = adaptTriviaQuestion(raw)!

    expect(result.correctOptionIds.length).toBe(1)
    const correct = result.options.find(
      (option) => option.id === result.correctOptionIds[0],
    )
    expect(correct?.text).toBe(raw.correctAnswer)
  })

  it('synthesises unique option ids under the raw question id', () => {
    const raw = makeTrivia()
    const result = adaptTriviaQuestion(raw)!
    const idPattern = new RegExp(`^${raw.id}-\\d+$`)

    for (const option of result.options) {
      expect(option.id).toMatch(idPattern)
    }

    const ids = result.options.map((option) => option.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('deduplicates repeated incorrect answers', () => {
    const result = adaptTriviaQuestion(
      makeTrivia({
        correctAnswer: 'right',
        incorrectAnswers: ['dup', 'dup', 'other'],
      }),
    )!

    const texts = result.options.map((option) => option.text).sort()
    expect(texts).toEqual(['dup', 'other', 'right'])
  })

  it('drops empty and whitespace-only answers', () => {
    const result = adaptTriviaQuestion(
      makeTrivia({
        correctAnswer: 'right',
        incorrectAnswers: ['', 'real', ' '],
      }),
    )!

    const texts = result.options.map((option) => option.text).sort()
    expect(texts).toEqual(['real', 'right'])
  })

  it('returns null when only the correct answer remains', () => {
    expect(adaptTriviaQuestion(makeTrivia({ incorrectAnswers: [] }))).toBeNull()
  })

  it('returns null when deduplication leaves a single option', () => {
    const result = adaptTriviaQuestion(
      makeTrivia({ correctAnswer: 'only', incorrectAnswers: ['only', 'only'] }),
    )
    expect(result).toBeNull()
  })
})
