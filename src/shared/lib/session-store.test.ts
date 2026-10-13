/**
 * Tests for the session store: survival batch loading (pure helpers +
 * reducer) and attempted-only session results.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  addQuestionBatch,
  canLoadMoreQuestions,
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
    multiple: false,
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
    repeatConfig: null,
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

  it('never batches a repeat-mistakes session', () => {
    const session = makeSession({ repeatConfig: survivalConfig })
    expect(canLoadMoreQuestions(session)).toBe(false)
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

  it('repeatMistakes resets the exhausted flag', () => {
    useQuizSessionStore.getState().markQuestionsExhausted()
    useQuizSessionStore.getState().repeatMistakes(survivalConfig)

    expect(useQuizSessionStore.getState().questionsExhausted).toBe(false)
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
    expect(result?.mistakes).toHaveLength(1)
    expect(result?.mistakes[0].question.id).toBe('q5')
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

  it('is the repeated question count in a repeat session', () => {
    // Every attempted question wrong → all of them come back for review.
    const answers: Record<string, string[]> = {}
    for (const q of pool) {
      answers[q.id] = q.options
        .filter((o) => !q.correctOptionIds.includes(o.id))
        .map((o) => o.id)
    }
    useQuizSessionStore.setState({
      answers,
      currentIndex: pool.length - 1,
      status: 'answered',
    })
    useQuizSessionStore.getState().finishSession(0, 30, 0)
    useQuizSessionStore.getState().repeatMistakes(survivalConfig)

    expect(useQuizSessionStore.getState().questionsTotal).toBe(pool.length)
  })
})
