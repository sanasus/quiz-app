/**
 * Category mapping (category-mapping.ts) — a quizapi leaf slug must
 * survive a provider switch onto a canonical trivia slug. Ported from
 * the frontend's triviaapi.test.ts.
 */

import { describe, expect, it } from 'vitest'
import { pickCanonicalSlug, resolveTriviaCategory } from './category-mapping'

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

describe('pickCanonicalSlug', () => {
  it('prefers an alias that also appears in metadata byCategory', () => {
    expect(
      pickCanonicalSlug(['Film & TV', 'film_and_tv'], { film_and_tv: 5 }),
    ).toBe('film_and_tv')
  })

  it('falls back to an underscored alias when metadata has neither', () => {
    expect(pickCanonicalSlug(['Film & TV', 'film_and_tv'], undefined)).toBe(
      'film_and_tv',
    )
  })

  it('falls back to the first alias when nothing else matches', () => {
    expect(pickCanonicalSlug(['Music'], { science: 1 })).toBe('Music')
  })
})
