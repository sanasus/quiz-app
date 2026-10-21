import { describe, expect, it } from 'vitest'
import i18n from 'i18next'
import en from '../../locales/en.json'
import ru from '../../locales/ru.json'
import type { SessionResult } from '../../shared/types/quiz'
import { buildShareCardData, buildShareText } from './share-card-data'

const instance = i18n.createInstance()
await instance.init({
  lng: 'en',
  resources: { en: { translation: en }, ru: { translation: ru } },
  interpolation: { escapeValue: false },
})
const t = instance.t.bind(instance)
const tRu = instance.getFixedT('ru')

function makeResult(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    score: 1240,
    correctCount: 3,
    incorrectCount: 1,
    totalQuestions: 4,
    timeSpent: 40,
    bestStreak: 2,
    finishedAt: Date.UTC(2026, 0, 15, 12),
    mode: 'blitz',
    difficulty: 'hard',
    category: 'all',
    mistakes: [],
    outcomes: [true, true, false, true],
    livesLeft: 3,
    ...overrides,
  }
}

const extras = { level: 4, isNewRecord: false, domain: 'quiz.example' }

describe('buildShareCardData', () => {
  it.each(['classic', 'timed', 'blitz'] as const)(
    'draws the answer grid for %s',
    (mode) => {
      const data = buildShareCardData(makeResult({ mode }), extras, t, 'en')
      expect(data.body).toEqual({
        kind: 'grid',
        outcomes: [true, true, false, true],
      })
    },
  )

  it('shows passed questions and lives for survival', () => {
    const data = buildShareCardData(
      makeResult({ mode: 'survival', correctCount: 12, livesLeft: 1 }),
      extras,
      t,
      'en',
    )
    expect(data.body).toMatchObject({
      kind: 'survival',
      passed: '12',
      lives: 1,
      maxLives: 3,
    })
  })

  it('builds pills, tiles and the record badge', () => {
    const data = buildShareCardData(
      makeResult(),
      { ...extras, isNewRecord: true },
      t,
      'en',
    )
    expect(data.pills).toEqual(['Blitz', 'Hard', 'All categories'])
    expect(data.recordLabel).toBe('New record')
    expect(data.tiles.map((x) => x.value)).toEqual(['3/4', '2', '4'])
    expect(data.tiles[1].icon).toBe('flame')
  })

  it('omits the record badge when there is no record', () => {
    expect(buildShareCardData(makeResult(), extras, t, 'en').recordLabel).toBe(
      undefined,
    )
  })
})

describe('buildShareText', () => {
  it('summarizes mode, difficulty, correct/total and points', () => {
    expect(buildShareText(makeResult(), t, 'en')).toBe(
      'Blitz · Hard · 3/4 · 1,240 points',
    )
  })

  it('uses Russian plural forms', () => {
    const text = (score: number) =>
      buildShareText(makeResult({ score }), tRu, 'ru')
    expect(text(1)).toContain('1 очко')
    expect(text(2)).toContain('2 очка')
    expect(text(5)).toContain('5 очков')
  })
})
