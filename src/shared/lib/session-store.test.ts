/**
 * Tests for the session store: survival batch loading (pure helpers +
 * reducer) and attempted-only session results.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  addQuestionBatch,
  canLoadMoreQuestions,
  isSessionActive,
  useQuizSessionStore,
} from './session-store'
import type { Question, QuizConfig, QuizSession } from '../types/quiz'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQuestion(id: string): Question {
  return {
    id,
    text: `Question ${id}`,
    options: [
      { id: `${id}-a`, text: 'A' },
      { id: `${id}-b`, text: 'B' },
    ],
    correctOptionIds: [`${id}-a`],
    difficulty: 'easy',
  }
}

const pool: Question[] = Array.from({ length: 10 }, (_, i) =>
  makeQuestion(`q${i + 1}`),
)

// questionCount is deliberately below the pool size: the setting must
// not affect survival at all (first batch of 10, then until the API runs out).
const survivalConfig: QuizConfig = {
  category: 'all',
  difficulty: 'easy',
  questionCount: 2,
  mode: 'survival',
}

function makeSession(overrides: Partial<QuizSession> = {}): QuizSession {
  return {
    status: 'playing',
    questions: pool.slice(),
    currentIndex: 0,
    answers: {},
    score: 0,
    streak: 0,
    bestStreak: 0,
    lives: 3,
    timeSpent: 0,
    mode: 'survival',
    config: survivalConfig,
    questionsExhausted: false,
    poolStart: 0,
    poolConsumed: 0,
    ...overrides,
  }
}

beforeEach(() => {
  useQuizSessionStore.getState().reset()
  useQuizSessionStore.getState().loadQuestions(pool, survivalConfig)
})

// ---------------------------------------------------------------------------
// canLoadMoreQuestions (pure)
// ---------------------------------------------------------------------------

describe('canLoadMoreQuestions', () => {
  it('allows batches while the pool is not exhausted', () => {
    expect(canLoadMoreQuestions(makeSession())).toBe(true)
  })

  it('stops once the pool is exhausted', () => {
    const session = makeSession({ questionsExhausted: true })
    expect(canLoadMoreQuestions(session)).toBe(false)
  })

  it('ignores questionCount: keeps loading past it', () => {
    const session = makeSession({
      config: { ...survivalConfig, questionCount: 10 },
    })
    expect(canLoadMoreQuestions(session)).toBe(true)
  })

  it('never batches outside survival mode', () => {
    expect(canLoadMoreQuestions(makeSession({ mode: 'classic' }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// addQuestionBatch (pure)
// ---------------------------------------------------------------------------

describe('addQuestionBatch', () => {
  it('appends new questions and reports how many were added', () => {
    const incoming = [pool[0], makeQuestion('new1'), makeQuestion('new2')]
    const { session, added } = addQuestionBatch(makeSession(), incoming)

    expect(added).toBe(2)
    expect(session.questions).toHaveLength(12)
    expect(session.questions[10].id).toBe('new1')
    expect(session.questions[11].id).toBe('new2')
  })

  it('deduplicates by question id', () => {
    const { session, added } = addQuestionBatch(makeSession(), pool.slice(0, 3))

    expect(added).toBe(0)
    expect(session.questions).toHaveLength(10)
  })

  it('ignores questionCount and appends the whole batch', () => {
    const state = makeSession({
      config: { ...survivalConfig, questionCount: 11 },
    })
    const { session, added } = addQuestionBatch(state, [
      makeQuestion('new1'),
      makeQuestion('new2'),
    ])

    expect(added).toBe(2)
    expect(session.questions).toHaveLength(12)
  })

  it('deduplicates within a single batch too', () => {
    const { session, added } = addQuestionBatch(makeSession(), [
      makeQuestion('new1'),
      makeQuestion('new1'),
    ])

    expect(added).toBe(1)
    expect(session.questions).toHaveLength(11)
  })

  it('ignores batches when there is no active session', () => {
    const state = makeSession({ questions: [] })
    const { session, added } = addQuestionBatch(state, [makeQuestion('x')])

    expect(added).toBe(0)
    expect(session.questions).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Store batch actions
// ---------------------------------------------------------------------------

describe('store batch actions', () => {
  it('appends a batch to the session', () => {
    useQuizSessionStore.getState().appendQuestions([makeQuestion('new1')])

    const s = useQuizSessionStore.getState()
    expect(s.questions).toHaveLength(11)
    expect(s.questionsExhausted).toBe(false)
  })

  it('marks the pool exhausted when a batch brings nothing new', () => {
    useQuizSessionStore.getState().appendQuestions([pool[0]])

    expect(useQuizSessionStore.getState().questionsExhausted).toBe(true)
  })

  it('ignores a stale batch after reset without flagging exhaustion', () => {
    useQuizSessionStore.getState().reset()
    useQuizSessionStore.getState().appendQuestions([makeQuestion('x')])

    const s = useQuizSessionStore.getState()
    expect(s.questions).toHaveLength(0)
    expect(s.questionsExhausted).toBe(false)
  })

  it('markQuestionsExhausted flags the pool', () => {
    useQuizSessionStore.getState().markQuestionsExhausted()

    expect(useQuizSessionStore.getState().questionsExhausted).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// NEXT_QUESTION — batch waiting and 0 lives
// ---------------------------------------------------------------------------

describe('NEXT_QUESTION (survival)', () => {
  function answerAtLastLoadedQuestion() {
    useQuizSessionStore.setState({
      currentIndex: pool.length - 1,
      status: 'answered',
      lives: 3,
    })
  }

  it('waits for the next batch at the last loaded question', () => {
    answerAtLastLoadedQuestion()
    useQuizSessionStore.getState().nextQuestion()

    const s = useQuizSessionStore.getState()
    expect(s.status).toBe('answered')
    expect(s.currentIndex).toBe(pool.length - 1)
  })

  it('finishes once the pool is exhausted', () => {
    answerAtLastLoadedQuestion()
    useQuizSessionStore.getState().markQuestionsExhausted()
    useQuizSessionStore.getState().nextQuestion()

    expect(useQuizSessionStore.getState().status).toBe('finished')
  })

  it('advances into a freshly appended batch', () => {
    answerAtLastLoadedQuestion()
    useQuizSessionStore.getState().appendQuestions([makeQuestion('q11')])
    useQuizSessionStore.getState().nextQuestion()

    const s = useQuizSessionStore.getState()
    expect(s.currentIndex).toBe(pool.length)
    expect(s.status).toBe('playing')
  })

  it('finishes at 0 lives without waiting for a pending batch', () => {
    answerAtLastLoadedQuestion()
    useQuizSessionStore.setState({ lives: 0 })
    useQuizSessionStore.getState().nextQuestion()

    expect(useQuizSessionStore.getState().status).toBe('finished')
  })

  it('finishes at 0 lives mid-session', () => {
    useQuizSessionStore.setState({
      currentIndex: 2,
      status: 'answered',
      lives: 0,
    })
    useQuizSessionStore.getState().nextQuestion()

    const s = useQuizSessionStore.getState()
    expect(s.status).toBe('finished')
    expect(s.currentIndex).toBe(2)
  })

  it('advances to the next loaded question while lives remain', () => {
    useQuizSessionStore.setState({ currentIndex: 2, status: 'answered' })
    useQuizSessionStore.getState().nextQuestion()

    const s = useQuizSessionStore.getState()
    expect(s.currentIndex).toBe(3)
    expect(s.status).toBe('playing')
  })
})

// ---------------------------------------------------------------------------
// finishSession — attempted questions only
// ---------------------------------------------------------------------------

describe('finishSession', () => {
  it('counts only attempted questions in mistakes and totals', () => {
    // Questions 1..4 answered correctly, question 5 (current) unanswered;
    // questions 6..10 are loaded but were never attempted.
    const answers: Record<string, string[]> = {}
    for (const q of pool.slice(0, 4)) answers[q.id] = [...q.correctOptionIds]

    useQuizSessionStore.setState({
      currentIndex: 4,
      status: 'answered',
      answers,
      bestStreak: 4,
    })
    useQuizSessionStore.getState().finishSession(80, 42, 4)

    const result = useQuizSessionStore.getState().finishedSession
    expect(result?.totalQuestions).toBe(5)
    expect(result?.correctCount).toBe(4)
    expect(result?.incorrectCount).toBe(1)
    expect(result?.bestStreak).toBe(4)
    expect(result?.finishedAt).toBeGreaterThan(0)
    expect(result?.attempts.map((a) => a.correct)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ])
    expect(result?.attempts[4].question.id).toBe('q5')
  })
})

// ---------------------------------------------------------------------------
// questionsTotal — pool size shown by the survival header ("Question 1/68")
// ---------------------------------------------------------------------------

describe('questionsTotal', () => {
  it('records the pool total on load', () => {
    useQuizSessionStore.getState().reset()
    useQuizSessionStore.getState().loadQuestions(pool, survivalConfig, 42)

    expect(useQuizSessionStore.getState().questionsTotal).toBe(42)
  })

  it('stays undefined when the API omits it', () => {
    expect(useQuizSessionStore.getState().questionsTotal).toBeUndefined()
  })

  it('takes the larger total when a batch updates it', () => {
    useQuizSessionStore.getState().appendQuestions([makeQuestion('new1')], 20)

    expect(useQuizSessionStore.getState().questionsTotal).toBe(20)
  })

  it('never shrinks on a stale smaller total', () => {
    useQuizSessionStore.getState().appendQuestions([makeQuestion('new1')], 20)
    useQuizSessionStore.getState().appendQuestions([makeQuestion('new2')], 12)

    expect(useQuizSessionStore.getState().questionsTotal).toBe(20)
  })

  it('keeps the previous total when a batch omits it', () => {
    useQuizSessionStore.getState().appendQuestions([makeQuestion('new1')], 20)
    useQuizSessionStore.getState().appendQuestions([makeQuestion('new2')])

    expect(useQuizSessionStore.getState().questionsTotal).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  it('clears sessionStartTime and timeRemaining', () => {
    useQuizSessionStore.getState().startSessionTimer()
    useQuizSessionStore.getState().startTimer(25)
    expect(useQuizSessionStore.getState().sessionStartTime).not.toBeNull()
    expect(useQuizSessionStore.getState().timeRemaining).toBe(25)

    useQuizSessionStore.getState().reset()

    const state = useQuizSessionStore.getState()
    expect(state.sessionStartTime).toBeNull()
    // Optional timed-mode field — must not survive a reset either.
    expect(state.timeRemaining).toBeUndefined()
    expect(state.status).toBe('idle')
    expect(state.questions).toEqual([])
    expect(state.finishedSession).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isSessionActive
// ---------------------------------------------------------------------------

describe('isSessionActive', () => {
  it('treats loading/playing/answered as an active session', () => {
    expect(isSessionActive('loading')).toBe(true)
    expect(isSessionActive('playing')).toBe(true)
    expect(isSessionActive('answered')).toBe(true)
  })

  it('treats idle/finished as inactive', () => {
    expect(isSessionActive('idle')).toBe(false)
    expect(isSessionActive('finished')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Pool cursor + filtered batches
// ---------------------------------------------------------------------------

describe('pool cursor and filtered batches', () => {
  beforeEach(() => {
    useQuizSessionStore.getState().reset()
    useQuizSessionStore
      .getState()
      .loadQuestions(pool.slice(0, 2), survivalConfig, 20, {
        start: 4,
        consumed: 3,
      })
  })

  it('loadQuestions keeps the pool position of the run', () => {
    const state = useQuizSessionStore.getState()
    expect(state.poolStart).toBe(4)
    expect(state.poolConsumed).toBe(3)
  })

  it('a batch advances the consumed count by the raw items it used', () => {
    useQuizSessionStore
      .getState()
      .appendQuestions([makeQuestion('n1')], 20, { rawCount: 5 })

    expect(useQuizSessionStore.getState().poolConsumed).toBe(8)
  })

  it('an all-filtered batch is not exhaustion when the source says so', () => {
    useQuizSessionStore
      .getState()
      .appendQuestions([], 20, { rawCount: 5, exhausted: false })

    const state = useQuizSessionStore.getState()
    expect(state.questionsExhausted).toBe(false)
    expect(state.poolConsumed).toBe(8)
  })

  it('the source can end the run even when the batch added questions', () => {
    useQuizSessionStore
      .getState()
      .appendQuestions([makeQuestion('n1')], 20, { exhausted: true })

    expect(useQuizSessionStore.getState().questionsExhausted).toBe(true)
  })

  it('reset clears the pool position', () => {
    useQuizSessionStore.getState().reset()

    expect(useQuizSessionStore.getState().poolStart).toBe(0)
    expect(useQuizSessionStore.getState().poolConsumed).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Double advance and an advance queued behind a batch
// ---------------------------------------------------------------------------

describe('NEXT_QUESTION guards', () => {
  beforeEach(() => {
    useQuizSessionStore.getState().reset()
    useQuizSessionStore.getState().loadQuestions(pool.slice(), survivalConfig)
  })

  it('a second advance in a row does not skip an unanswered question', () => {
    useQuizSessionStore.setState({ currentIndex: 0, status: 'answered' })

    useQuizSessionStore.getState().nextQuestion()
    useQuizSessionStore.getState().nextQuestion()

    const s = useQuizSessionStore.getState()
    expect(s.currentIndex).toBe(1)
    expect(s.status).toBe('playing')
  })

  it('does nothing outside the answered state', () => {
    useQuizSessionStore.setState({ currentIndex: 3, status: 'playing' })

    useQuizSessionStore.getState().nextQuestion()

    expect(useQuizSessionStore.getState().currentIndex).toBe(3)
  })

  it('applies an advance requested while the batch was loading', () => {
    useQuizSessionStore.setState({
      currentIndex: pool.length - 1,
      status: 'answered',
    })
    useQuizSessionStore.getState().nextQuestion()
    expect(useQuizSessionStore.getState().advancePending).toBe(true)

    useQuizSessionStore.getState().appendQuestions([makeQuestion('q11')])

    const s = useQuizSessionStore.getState()
    expect(s.currentIndex).toBe(pool.length)
    expect(s.status).toBe('playing')
    expect(s.advancePending).toBe(false)
  })

  it('without a request the batch just lands and the player stays put', () => {
    useQuizSessionStore.setState({
      currentIndex: pool.length - 1,
      status: 'answered',
    })

    useQuizSessionStore.getState().appendQuestions([makeQuestion('q11')])

    const s = useQuizSessionStore.getState()
    expect(s.currentIndex).toBe(pool.length - 1)
    expect(s.status).toBe('answered')
  })

  it('an exhausted pool drops the queued advance', () => {
    useQuizSessionStore.setState({
      currentIndex: pool.length - 1,
      status: 'answered',
    })
    useQuizSessionStore.getState().nextQuestion()

    useQuizSessionStore.getState().appendQuestions([], undefined, {
      exhausted: true,
    })

    expect(useQuizSessionStore.getState().advancePending).toBe(false)
  })

  it('reset clears a queued advance', () => {
    useQuizSessionStore.setState({
      currentIndex: pool.length - 1,
      status: 'answered',
    })
    useQuizSessionStore.getState().nextQuestion()

    useQuizSessionStore.getState().reset()

    expect(useQuizSessionStore.getState().advancePending).toBe(false)
  })
})
