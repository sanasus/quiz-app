/**
 * Tests for game mode behaviors.
 *
 * Each mode is tested as a pure function: given a session state,
 * the mode functions return the correct state delta.
 */

import { describe, it, expect } from 'vitest'
import { ClassicMode } from './classic'
import { TimedMode } from './timed'
import { BlitzMode } from './blitz'
import { SurvivalMode } from './survival'
import type { QuizSession } from '../../shared/types/quiz'

// ---------------------------------------------------------------------------
// Helper: build a minimal QuizSession for testing
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<QuizSession> = {}): QuizSession {
  return {
    status: 'playing',
    questions: [
      {
        id: 'q1',
        text: 'Question 1',
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        correctOptionIds: ['a'],
        multiple: false,
        difficulty: 'easy',
      },
      {
        id: 'q2',
        text: 'Question 2',
        options: [],
        correctOptionIds: [],
        multiple: false,
        difficulty: 'easy',
      },
    ],
    currentIndex: 0,
    answers: {},
    score: 0,
    streak: 2,
    bestStreak: 2,
    lives: 3,
    timeSpent: 30,
    mode: 'classic',
    config: {
      category: 'all',
      difficulty: 'easy',
      questionCount: 2,
      mode: 'classic',
    },
    repeatConfig: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Classic mode
// ---------------------------------------------------------------------------

describe('ClassicMode', () => {
  it('has no timer', () => {
    expect(ClassicMode.timeLimitPerQuestion).toBeNull()
  })

  it('has no lives', () => {
    expect(ClassicMode.lives).toBeNull()
  })

  it('does not auto-submit', () => {
    expect(ClassicMode.autoSubmitOnSelection).toBe(false)
  })

  it('onSkip resets streak', () => {
    const state = makeSession({ streak: 5, mode: 'classic' })
    const delta = ClassicMode.onSkip(state)
    expect(delta.status).toBe('answered')
    expect(delta.streak).toBe(0)
  })

  it('onQuestionAdvance increments index', () => {
    const state = makeSession({ currentIndex: 0, mode: 'classic' })
    const delta = ClassicMode.onQuestionAdvance(state)
    expect(delta.currentIndex).toBe(1)
    expect(delta.status).toBe('playing')
  })

  it('onWrongAnswer does not change lives', () => {
    const state = makeSession({ lives: 3, mode: 'classic' })
    const delta = ClassicMode.onWrongAnswer(state)
    expect(delta.lives).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Timed mode
// ---------------------------------------------------------------------------

describe('TimedMode', () => {
  it('has a total session timer', () => {
    expect(TimedMode.timerBehavior).toBe('total')
    expect(TimedMode.timerLimit).toBeTypeOf('function')
    const limit = (TimedMode.timerLimit as (count: number) => number)(5)
    expect(limit).toBe(50)
  })

  it('has no per-question timer', () => {
    expect(TimedMode.timeLimitPerQuestion).toBeNull()
  })

  it('onTimeUp ends the session', () => {
    const state = makeSession({ mode: 'timed' })
    const delta = TimedMode.onTimeUp(state)
    expect(delta.status).toBe('finished')
    expect(delta.timeRemaining).toBe(0)
  })

  it('onQuestionAdvance increments index without resetting timer', () => {
    const state = makeSession({ currentIndex: 0, mode: 'timed' })
    const delta = TimedMode.onQuestionAdvance(state)
    expect(delta.currentIndex).toBe(1)
    expect(delta.status).toBe('playing')
    expect(delta.timeRemaining).toBeUndefined()
  })

  it('onWrongAnswer does not change lives', () => {
    const state = makeSession({ lives: 3, mode: 'timed' })
    const delta = TimedMode.onWrongAnswer(state)
    expect(delta.lives).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Blitz mode
// ---------------------------------------------------------------------------

describe('BlitzMode', () => {
  it('has no per-question timer limit', () => {
    expect(BlitzMode.timeLimitPerQuestion).toBeNull()
  })

  it('has a dynamic timer limit', () => {
    expect(typeof BlitzMode.timerLimit).toBe('function')
    const limit = (BlitzMode.timerLimit as (count: number) => number)(5)
    expect(limit).toBe(15)
  })

  it('auto-submits on selection', () => {
    expect(BlitzMode.autoSubmitOnSelection).toBe(true)
  })

  it('onTimeUp on last question ends session', () => {
    const state = makeSession({
      mode: 'blitz',
      currentIndex: 1,
      questions: [
        {
          id: 'q1',
          text: '',
          options: [],
          correctOptionIds: [],
          multiple: false,
          difficulty: 'easy',
        },
        {
          id: 'q2',
          text: '',
          options: [],
          correctOptionIds: [],
          multiple: false,
          difficulty: 'easy',
        },
      ],
    })
    const delta = BlitzMode.onTimeUp(state)
    expect(delta.status).toBe('finished')
  })

  it('onTimeUp on non-last question resets timer', () => {
    const state = makeSession({
      mode: 'blitz',
      currentIndex: 0,
    })
    const delta = BlitzMode.onTimeUp(state)
    expect(delta.status).toBe('answered')
    expect(delta.timeRemaining).toBeGreaterThan(0)
  })

  it('onQuestionAdvance resets timer', () => {
    const state = makeSession({ currentIndex: 0, mode: 'blitz' })
    const delta = BlitzMode.onQuestionAdvance(state)
    expect(delta.currentIndex).toBe(1)
    expect(delta.timeRemaining).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Survival mode
// ---------------------------------------------------------------------------

describe('SurvivalMode', () => {
  it('has no timer', () => {
    expect(SurvivalMode.timeLimitPerQuestion).toBeNull()
    expect(SurvivalMode.timerLimit).toBeNull()
  })

  it('starts with 3 lives', () => {
    expect(SurvivalMode.lives).toBe(3)
  })

  it('onWrongAnswer loses a life', () => {
    const state = makeSession({ lives: 3, mode: 'survival' })
    const delta = SurvivalMode.onWrongAnswer(state)
    expect(delta.lives).toBe(2)
    expect(delta.streak).toBe(0)
  })

  it('onSkip loses a life', () => {
    const state = makeSession({ lives: 3, mode: 'survival' })
    const delta = SurvivalMode.onSkip(state)
    expect(delta.lives).toBe(2)
  })

  it('onTimeUp on last question loses a life and ends session', () => {
    const state = makeSession({
      lives: 2,
      mode: 'survival',
      currentIndex: 1,
      questions: [
        {
          id: 'q1',
          text: '',
          options: [],
          correctOptionIds: [],
          multiple: false,
          difficulty: 'easy',
        },
        {
          id: 'q2',
          text: '',
          options: [],
          correctOptionIds: [],
          multiple: false,
          difficulty: 'easy',
        },
      ],
    })
    const delta = SurvivalMode.onTimeUp(state)
    expect(delta.status).toBe('finished')
    expect(delta.lives).toBe(1)
    expect(delta.timeRemaining).toBe(0)
  })

  it('onTimeUp on non-last question loses a life', () => {
    const state = makeSession({
      lives: 2,
      mode: 'survival',
      currentIndex: 0,
    })
    const delta = SurvivalMode.onTimeUp(state)
    expect(delta.status).toBe('answered')
    expect(delta.lives).toBe(1)
    expect(delta.timeRemaining).toBeUndefined()
  })

  it('onCorrectAnswer does not change lives', () => {
    const state = makeSession({ lives: 3, mode: 'survival' })
    const delta = SurvivalMode.onCorrectAnswer(state)
    expect(delta.lives).toBeUndefined()
  })
})
