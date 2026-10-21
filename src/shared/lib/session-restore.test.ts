import { describe, expect, it } from 'vitest'
import { restoreSession, useQuizSessionStore } from './session-store'
import { persistedSessionSchema, type PersistedSession } from './session-schema'

function persisted(
  overrides: Partial<PersistedSession> = {},
): PersistedSession {
  return {
    status: 'playing',
    questions: [
      {
        id: 'q1',
        text: 'Q1',
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        correctOptionIds: ['a'],
        difficulty: 'easy',
      },
    ],
    currentIndex: 0,
    answers: {},
    score: 0,
    streak: 0,
    bestStreak: 0,
    lives: 3,
    timeSpent: 0,
    mode: 'blitz',
    config: {
      category: 'all',
      difficulty: 'easy',
      questionCount: 1,
      mode: 'blitz',
    },
    timeRemaining: 7,
    questionsExhausted: false,
    poolStart: 0,
    poolConsumed: 0,
    finishedSession: null,
    sessionStartTime: 1_000,
    savedAt: 5_000,
    ...overrides,
  }
}

describe('restoreSession', () => {
  it('keeps the saved countdown', () => {
    expect(restoreSession(persisted(), 9_000).timeRemaining).toBe(7)
  })

  it('moves the session start forward by the time the page was gone', () => {
    // Saved at 5s, restored at 9s: 4s away are not session time.
    expect(restoreSession(persisted(), 9_000).sessionStartTime).toBe(5_000)
  })

  it('never moves the start backwards on a clock skew', () => {
    expect(restoreSession(persisted(), 2_000).sessionStartTime).toBe(1_000)
  })

  it('restarts a run that was still loading from idle', () => {
    expect(restoreSession(persisted({ status: 'loading' }), 9_000).status).toBe(
      'idle',
    )
  })

  it('leaves a finished session untouched', () => {
    const restored = restoreSession(persisted({ status: 'finished' }), 9_000)
    expect(restored.status).toBe('finished')
    expect(restored.sessionStartTime).toBe(1_000)
  })
})

describe('persisted session schema', () => {
  it('accepts a valid snapshot and rejects a corrupt one', () => {
    expect(persistedSessionSchema.safeParse(persisted()).success).toBe(true)
    expect(
      persistedSessionSchema.safeParse({ ...persisted(), questions: 'nope' })
        .success,
    ).toBe(false)
  })
})

describe('store persistence', () => {
  it('writes the session to sessionStorage', () => {
    useQuizSessionStore.getState().updateConfig({ category: 'persist-check' })
    const raw = sessionStorage.getItem('quiz-session')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '{}').state.config.category).toBe('persist-check')
    useQuizSessionStore.getState().updateConfig({ category: 'all' })
  })
})

describe('persisted session migration', () => {
  it('upgrades a v1 payload with an empty pool cursor', () => {
    const migrate = useQuizSessionStore.persist.getOptions().migrate
    const { poolStart, poolConsumed, ...v1 } = persisted()
    void poolStart
    void poolConsumed

    const upgraded = migrate?.(v1, 1)

    expect(persistedSessionSchema.safeParse(upgraded).success).toBe(true)
    expect(upgraded).toMatchObject({ poolStart: 0, poolConsumed: 0 })
  })
})
