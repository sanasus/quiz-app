/**
 * Session store — Zustand store for quiz session state.
 *
 * FSM: idle → loading → playing → (answered) → finished
 */

import { create } from 'zustand'
import type {
  Question,
  QuizConfig,
  QuizSession,
  SessionAction,
  SessionResult,
} from '../types/quiz'
import { getMode } from '../../features/modes'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIVES = 3

export const DEFAULT_CONFIG: QuizConfig = {
  category: 'all',
  difficulty: 'easy',
  questionCount: 2,
  mode: 'classic',
}

// ---------------------------------------------------------------------------
// Time limit helpers
// ---------------------------------------------------------------------------

/** Timed mode: 10 seconds per question. */
export function getTimedTimeLimit(questionCount: number): number {
  return questionCount * 10
}

/** Blitz mode: total time limit scales with question count (minimum 10s). */
export function getBlitzTimeLimit(questionCount: number): number {
  return Math.max(10, questionCount * 3)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizSessionStore extends QuizSession {
  // Preserved after session finishes (for /results screen)
  finishedSession: SessionResult | null
  sessionStartTime: number | null

  // Actions
  startLoading: () => void
  startSessionTimer: () => void
  loadQuestions: (
    questions: Question[],
    config: QuizConfig,
    total?: number,
  ) => void
  startPlaying: () => void
  startTimer: (timeRemaining: number) => void
  timerTick: () => void
  timeUp: () => void
  selectOption: (optionId: string) => void
  submitAnswer: (scoreDelta: number) => void
  skipQuestion: () => void
  nextQuestion: () => void
  updateConfig: (partial: Partial<QuizConfig>) => void
  finishSession: (
    score: number,
    timeSpent: number,
    correctCount: number,
  ) => void
  loseLife: () => void
  /** Append a fetched question batch (survival batch loading). */
  appendQuestions: (questions: Question[], total?: number) => void
  /** No further question batches will arrive (fetch error / pool empty). */
  markQuestionsExhausted: () => void
  resetBlitzTimer: () => void
  repeatMistakes: (config: QuizConfig) => void
  reset: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInitialState(config: QuizConfig): QuizSession {
  return {
    status: 'idle',
    questions: [],
    currentIndex: 0,
    answers: {},
    score: 0,
    streak: 0,
    bestStreak: 0,
    lives: DEFAULT_LIVES,
    timeSpent: 0,
    mode: config.mode,
    config,
    questionsExhausted: false,
    questionsTotal: undefined,
    repeatConfig: null,
  }
}

/**
 * Whether another question batch may still arrive (survival batch loading).
 *
 * The question-count setting does NOT apply to survival: batches keep
 * arriving until the API runs out of questions. Pure — used by the
 * reducer, the session-end hook and the UI to decide between "wait for
 * the next batch" and "finish the session".
 */
export function canLoadMoreQuestions(state: QuizSession): boolean {
  return (
    state.mode === 'survival' &&
    state.repeatConfig === null &&
    !state.questionsExhausted
  )
}

/**
 * Append a question batch to the session.
 *
 * Pure: deduplicates by id (including within the batch) and reports
 * how many questions were actually added (0 = pool exhausted). No cap
 * by questionCount — survival runs until the API runs out.
 */
export function addQuestionBatch(
  state: QuizSession,
  incoming: readonly Question[],
): { session: QuizSession; added: number } {
  // No active session (reset / idle) — ignore stale batches.
  if (state.questions.length === 0) return { session: state, added: 0 }

  const seen = new Set(state.questions.map((q) => q.id))
  const additions: Question[] = []
  for (const q of incoming) {
    if (seen.has(q.id)) continue
    seen.add(q.id)
    additions.push(q)
  }

  if (additions.length === 0) return { session: state, added: 0 }

  return {
    session: { ...state, questions: [...state.questions, ...additions] },
    added: additions.length,
  }
}

/**
 * Keep the largest known pool size: the server pool can grow while a
 * run is in progress, and a stale smaller total must not shrink it.
 */
function mergePoolTotal(
  current: number | undefined,
  incoming: number | undefined,
): number | undefined {
  if (incoming === undefined) return current
  if (current === undefined) return incoming
  return Math.max(current, incoming)
}

function sessionReducer(
  state: QuizSession,
  action: SessionAction,
): QuizSession {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, status: 'loading' }

    case 'LOAD_QUESTIONS': {
      const s = {
        ...state,
        status: 'loading',
        questions: action.payload.questions,
        config: action.payload.config,
      }
      return {
        ...s,
        status: 'playing',
        currentIndex: 0,
        answers: {},
        score: 0,
        streak: 0,
        bestStreak: 0,
        lives: DEFAULT_LIVES,
        timeSpent: 0,
        timeRemaining: undefined,
        questionsExhausted: false,
        questionsTotal: action.payload.total,
      }
    }

    case 'START_PLAYING':
      return { ...state, status: 'playing' }

    case 'START_TIMER':
      return {
        ...state,
        timeRemaining: action.payload.timeRemaining,
      }

    case 'TIMER_TICK': {
      const remaining = (state.timeRemaining ?? 1) - 1
      if (remaining <= 0) {
        return { ...state, timeRemaining: 0 }
      }
      return { ...state, timeRemaining: remaining }
    }

    case 'TIME_UP': {
      const mode = getMode(state.mode)
      return { ...state, ...mode.onTimeUp(state) }
    }

    case 'SELECT_OPTION': {
      const { questionId, optionId } = action.payload
      const question = state.questions[state.currentIndex]
      if (!question) return state

      const currentAnswers = state.answers[question.id] ?? []
      const newAnswers: string[] = []

      if (question.multiple) {
        // Toggle option for multiple choice
        if (currentAnswers.includes(optionId)) {
          newAnswers.push(...currentAnswers.filter((id) => id !== optionId))
        } else {
          newAnswers.push(...currentAnswers, optionId)
        }
      } else {
        // Single choice: replace
        newAnswers.push(optionId)
      }

      return {
        ...state,
        answers: {
          ...state.answers,
          [questionId]: newAnswers,
        },
      }
    }

    case 'SUBMIT_ANSWER': {
      const question = state.questions[state.currentIndex]
      if (!question) return state

      const selected = state.answers[question.id] ?? []
      if (selected.length === 0) return state

      // Correct = exact match of option sets
      const isCorrect =
        question.correctOptionIds.length === selected.length &&
        question.correctOptionIds.every((id) => selected.includes(id))

      const base: QuizSession = {
        ...state,
        status: 'answered',
        score: state.score + (isCorrect ? action.payload.scoreDelta : 0),
      }

      if (isCorrect) {
        return {
          ...base,
          streak: state.streak + 1,
          bestStreak: Math.max(state.bestStreak, state.streak + 1),
          ...getMode(state.mode).onCorrectAnswer(base),
        }
      }

      return {
        ...base,
        streak: 0,
        bestStreak: state.bestStreak,
        ...getMode(state.mode).onWrongAnswer({
          ...base,
          streak: 0,
          bestStreak: state.bestStreak,
        }),
      }
    }

    case 'SKIP_QUESTION': {
      const mode = getMode(state.mode)
      return {
        ...state,
        status: 'answered',
        streak: 0,
        bestStreak: state.bestStreak,
        ...mode.onSkip(state),
      }
    }

    case 'NEXT_QUESTION': {
      const mode = getMode(state.mode)
      const delta = mode.onQuestionAdvance(state)
      const nextIndex = state.currentIndex + 1

      // A mode may end the session while advancing (survival: 0 lives).
      // Checked before the batch-wait branch so a fatal answer ends the
      // run immediately, even with a pending question batch.
      if (delta.status === 'finished') {
        return { ...state, ...delta }
      }

      if (nextIndex >= state.questions.length) {
        // Survival batch loading: the next question may still be on its
        // way — wait instead of finishing the session.
        if (canLoadMoreQuestions(state)) return state
        return { ...state, status: 'finished' }
      }

      return {
        ...state,
        ...delta,
      }
    }

    case 'APPEND_QUESTIONS': {
      // Stale batch (session reset / idle) — ignore entirely.
      if (state.questions.length === 0) return state

      const { session, added } = addQuestionBatch(
        state,
        action.payload.questions,
      )
      const withTotal = {
        ...session,
        questionsTotal: mergePoolTotal(
          state.questionsTotal,
          action.payload.total,
        ),
      }
      // Nothing new in the batch — no further batches will arrive.
      if (added === 0) return { ...withTotal, questionsExhausted: true }
      return withTotal
    }

    case 'MARK_QUESTIONS_EXHAUSTED':
      return { ...state, questionsExhausted: true }

    case 'FINISH_SESSION':
      return {
        ...state,
        status: 'finished',
        score: action.payload.score,
        timeSpent: action.payload.timeSpent,
      }

    case 'LOSE_LIFE':
      return { ...state, lives: Math.max(0, state.lives - 1) }

    case 'REPEAT_MISTAKES':
      return {
        ...createInitialState(action.payload.config),
        questions: action.payload.questions,
        status: 'playing',
        repeatConfig: action.payload.config,
        questionsTotal: action.payload.questions.length,
      }

    case 'RESET':
      return {
        ...createInitialState(state.config),
        status: 'idle',
      }

    case 'RESET_BLITZ_TIMER':
      return {
        ...state,
        timeRemaining: getBlitzTimeLimit(state.questions.length),
      }

    case 'UPDATE_CONFIG':
      return {
        ...state,
        config: { ...state.config, ...action.payload },
      }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useQuizSessionStore = create<QuizSessionStore>((set) => ({
  ...createInitialState(DEFAULT_CONFIG),
  finishedSession: null,
  sessionStartTime: null,

  startLoading: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'START_LOADING' }) })),
  loadQuestions: (questions, config, total) =>
    set((s) => ({
      ...sessionReducer(s, {
        type: 'LOAD_QUESTIONS',
        payload: { questions, config, total },
      }),
    })),
  startPlaying: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'START_PLAYING' }) })),
  startTimer: (timeRemaining) =>
    set((s) => ({
      ...sessionReducer(s, {
        type: 'START_TIMER',
        payload: { timeRemaining },
      }),
    })),
  timerTick: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'TIMER_TICK' }) })),
  timeUp: () => set((s) => ({ ...sessionReducer(s, { type: 'TIME_UP' }) })),
  selectOption: (optionId) =>
    set((s) => {
      const question = s.questions[s.currentIndex]
      if (!question) return s
      return {
        ...sessionReducer(s, {
          type: 'SELECT_OPTION',
          payload: { questionId: question.id, optionId },
        }),
      }
    }),
  submitAnswer: (scoreDelta) =>
    set((s) => ({
      ...sessionReducer(s, { type: 'SUBMIT_ANSWER', payload: { scoreDelta } }),
    })),
  skipQuestion: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'SKIP_QUESTION' }) })),
  nextQuestion: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'NEXT_QUESTION' }) })),
  updateConfig: (partial) =>
    set((s) => ({
      ...sessionReducer(s, {
        type: 'UPDATE_CONFIG',
        payload: partial,
      }),
    })),
  finishSession: (score, timeSpent, correctCount) =>
    set((s) => {
      // Only questions the user actually attempted (0..currentIndex):
      // survival may end with a partially loaded pool, timed mode may
      // run out of time mid-session — unattempted questions don't count.
      const attempted = s.questions.slice(0, s.currentIndex + 1)

      const mistakes: SessionResult['mistakes'] = []
      for (const q of attempted) {
        const selected = s.answers[q.id] ?? []
        const isCorrect =
          q.correctOptionIds.length === selected.length &&
          q.correctOptionIds.every((id) => selected.includes(id))
        if (!isCorrect) {
          mistakes.push({ question: q, selectedOptionIds: selected })
        }
      }

      const result: SessionResult = {
        score,
        correctCount,
        incorrectCount: attempted.length - correctCount,
        totalQuestions: attempted.length,
        timeSpent,
        bestStreak: s.bestStreak,
        finishedAt: Date.now(),
        mode: s.mode,
        difficulty: s.config.difficulty,
        category: s.config.category,
        mistakes,
      }

      return {
        ...sessionReducer(s, {
          type: 'FINISH_SESSION',
          payload: { score, timeSpent, correctCount },
        }),
        finishedSession: result,
      }
    }),
  loseLife: () => set((s) => ({ ...sessionReducer(s, { type: 'LOSE_LIFE' }) })),
  appendQuestions: (questions, total) =>
    set((s) => ({
      ...sessionReducer(s, {
        type: 'APPEND_QUESTIONS',
        payload: { questions, total },
      }),
    })),
  markQuestionsExhausted: () =>
    set((s) => ({
      ...sessionReducer(s, { type: 'MARK_QUESTIONS_EXHAUSTED' }),
    })),
  resetBlitzTimer: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'RESET_BLITZ_TIMER' }) })),
  repeatMistakes: (config) =>
    set((s) => {
      const mistakes = s.finishedSession?.mistakes ?? []
      return {
        ...sessionReducer(s, {
          type: 'REPEAT_MISTAKES',
          payload: { questions: mistakes.map((m) => m.question), config },
        }),
      }
    }),
  reset: () =>
    set((s) => ({
      ...sessionReducer(s, { type: 'RESET' }),
      finishedSession: null,
    })),
  startSessionTimer: () => set({ sessionStartTime: Date.now() }),
}))
