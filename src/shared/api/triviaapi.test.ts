/**
 * Pure logic of the trivia fallback (triviaapi.ts): category slug
 * resolution, URL construction and raw → Question adaptation.
 *
 * Fetch functions are network-bound and intentionally not covered;
 * option order is shuffled by adaptTriviaQuestion, so every assertion
 * compares sorted multisets instead of positions.
 */

import { describe, expect, it } from 'vitest'
import {
  adaptTriviaQuestion,
  buildTriviaCountUrl,
  buildTriviaQuestionsUrl,
  resolveTriviaCategory,
} from './triviaapi'
import type { QuizConfig } from '../types/quiz'
import type { TriviaApiQuestion } from './schemas'

const QUESTIONS_BASE = 'https://the-trivia-api.com/v2/questions?'
const COUNT_BASE = 'https://the-trivia-api.com/v2/questions/count?'

const baseConfig: QuizConfig = {
  category: 'all',
  difficulty: 'easy',
  questionCount: 5,
  mode: 'classic',
}

const page = { limit: 10, offset: 20 }

// Helper: minimal valid raw trivia question.
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

describe('resolveTriviaCategory', () => {
  it('treats all, empty and undefined slugs as "no filter"', () => {
    expect(resolveTriviaCategory('all')).toBeNull()
    expect(resolveTriviaCategory('')).toBeNull()
    expect(resolveTriviaCategory(undefined)).toBeNull()
  })

  it('keeps canonical trivia slugs unchanged', () => {
    const canonical = [
      'science',
      'film_and_tv',
      'society_and_culture',
      'general_knowledge',
      'geography',
    ]
    for (const slug of canonical) {
      expect(resolveTriviaCategory(slug)).toBe(slug)
    }
  })

  it('maps trivia aliases onto their canonical slug', () => {
    expect(resolveTriviaCategory('movies')).toBe('film_and_tv')
    expect(resolveTriviaCategory('sports')).toBe('sport_and_leisure')
    expect(resolveTriviaCategory('literature')).toBe('arts_and_literature')
    expect(resolveTriviaCategory('games')).toBe('sport_and_leisure')
    expect(resolveTriviaCategory('drink')).toBe('food_and_drink')
  })

  it('maps quizapi leaf slugs onto a trivia category', () => {
    expect(resolveTriviaCategory('physics')).toBe('science')
    expect(resolveTriviaCategory('world-wars')).toBe('history')
    expect(resolveTriviaCategory('world-capitals')).toBe('geography')
    expect(resolveTriviaCategory('shakespeare')).toBe('arts_and_literature')
    expect(resolveTriviaCategory('anime')).toBe('film_and_tv')
    expect(resolveTriviaCategory('food-and-drink')).toBe('food_and_drink')
    expect(resolveTriviaCategory('mythology')).toBe('society_and_culture')
    expect(resolveTriviaCategory('art-and-architecture')).toBe(
      'arts_and_literature',
    )
    expect(resolveTriviaCategory('fun-facts')).toBe('general_knowledge')
  })

  it('returns null for topics without a trivia counterpart', () => {
    const unmapped = [
      'javascript',
      'docker',
      'postgresql',
      'cryptography',
      'algebra',
      'investing',
      'video-games',
      'comics',
      'fashion',
    ]
    for (const slug of unmapped) {
      expect(resolveTriviaCategory(slug)).toBeNull()
    }
  })

  it('returns null for unknown slugs', () => {
    expect(resolveTriviaCategory('unknown-slug-xyz')).toBeNull()
  })
})

describe('buildTriviaQuestionsUrl', () => {
  it('targets the questions endpoint', () => {
    const url = buildTriviaQuestionsUrl(baseConfig, page)
    expect(url.startsWith(QUESTIONS_BASE)).toBe(true)
  })

  it('sends limit and offset', () => {
    const url = buildTriviaQuestionsUrl(baseConfig, page)
    expect(url).toContain('limit=10')
    expect(url).toContain('offset=20')
  })

  it('clamps limit to the API cap of 50', () => {
    for (const limit of [99, 500]) {
      const url = buildTriviaQuestionsUrl(baseConfig, { limit, offset: 0 })
      expect(new URL(url).searchParams.get('limit')).toBe('50')
    }
  })

  it('sends the configured difficulty', () => {
    const hard = buildTriviaQuestionsUrl(
      { ...baseConfig, difficulty: 'hard' },
      page,
    )
    const medium = buildTriviaQuestionsUrl(
      { ...baseConfig, difficulty: 'medium' },
      page,
    )
    expect(hard).toContain('difficulties=hard')
    expect(medium).toContain('difficulties=medium')
  })

  it('always requests text_choice questions', () => {
    expect(buildTriviaQuestionsUrl(baseConfig, page)).toContain(
      'types=text_choice',
    )
  })

  it('passes the category only when the slug maps to trivia', () => {
    const physics = buildTriviaQuestionsUrl(
      { ...baseConfig, category: 'physics' },
      page,
    )
    const movies = buildTriviaQuestionsUrl(
      { ...baseConfig, category: 'movies' },
      page,
    )
    const javascript = buildTriviaQuestionsUrl(
      { ...baseConfig, category: 'javascript' },
      page,
    )
    const all = buildTriviaQuestionsUrl(baseConfig, page)

    expect(physics).toContain('categories=science')
    expect(movies).toContain('categories=film_and_tv')
    expect(all).not.toContain('categories=')
    expect(javascript).not.toContain('categories=')
  })
})

describe('buildTriviaCountUrl', () => {
  it('targets the count endpoint', () => {
    expect(buildTriviaCountUrl(baseConfig).startsWith(COUNT_BASE)).toBe(true)
  })

  it('applies the same difficulty and type filters', () => {
    const url = buildTriviaCountUrl({ ...baseConfig, difficulty: 'hard' })
    expect(url).toContain('difficulties=hard')
    expect(url).toContain('types=text_choice')
  })

  it('never paginates', () => {
    const url = buildTriviaCountUrl(baseConfig)
    expect(url).not.toContain('limit=')
    expect(url).not.toContain('offset=')
  })

  it('passes a mapped category and omits an unmapped one', () => {
    const wars = buildTriviaCountUrl({ ...baseConfig, category: 'world-wars' })
    expect(wars).toContain('categories=history')
    expect(buildTriviaCountUrl(baseConfig)).not.toContain('categories=')
  })
})

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
    const raw = makeTrivia({
      correctAnswer: 'right',
      incorrectAnswers: ['dup', 'dup', 'other'],
    })
    const result = adaptTriviaQuestion(raw)!

    const texts = result.options.map((option) => option.text).sort()
    expect(texts).toEqual(['dup', 'other', 'right'])
  })

  it('drops empty and whitespace-only answers', () => {
    const raw = makeTrivia({
      correctAnswer: 'right',
      incorrectAnswers: ['', 'real', ' '],
    })
    const result = adaptTriviaQuestion(raw)!

    const texts = result.options.map((option) => option.text).sort()
    expect(texts).toEqual(['real', 'right'])
  })

  it('returns null when only the correct answer remains', () => {
    const raw = makeTrivia({ incorrectAnswers: [] })
    expect(adaptTriviaQuestion(raw)).toBeNull()
  })

  it('returns null when deduplication leaves a single option', () => {
    const raw = makeTrivia({
      correctAnswer: 'only',
      incorrectAnswers: ['only', 'only'],
    })
    expect(adaptTriviaQuestion(raw)).toBeNull()
  })
})
