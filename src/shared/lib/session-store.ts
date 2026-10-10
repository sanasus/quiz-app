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

/** Blitz mode: fixed time limit based on question count. */
export function getBlitzTimeLimit(questionCount: number): number {
  return Math.max(10, questionCount * 3)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizSessionStore extends QuizSession {
  // Preserved after session finishes (for /results screen)
  finishedSession: SessionResult | null

  // Actions
  startLoading: () => void
  loadQuestions: (questions: Question[], config: QuizConfig) => void
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
  setBlitzTimeElapsed: (elapsed: number) => void
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
    repeatConfig: null,
  }
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
      // Only blitz mode auto-finishes on tick; timed mode handles timeout in useEffect
      if (remaining <= 0) {
        if (state.mode === 'blitz') {
          return { ...state, timeRemaining: 0, status: 'finished' }
        }
        return { ...state, timeRemaining: 0 }
      }
      return { ...state, timeRemaining: remaining }
    }

    case 'TIME_UP': {
      if (state.mode === 'timed') {
        // Auto-advance to next question on timeout
        const nextIndex = state.currentIndex + 1
        if (nextIndex >= state.questions.length) {
          return { ...state, status: 'finished', timeRemaining: 0 }
        }
        // Reset timeRemaining for the next question (10s per remaining question)
        const remainingQuestions = state.config.questionCount - nextIndex
        const timeRemaining = remainingQuestions * 10
        return {
          ...state,
          status: 'playing',
          currentIndex: nextIndex,
          streak: 0,
          bestStreak: state.bestStreak,
          lives: state.lives,
          timeRemaining,
        }
      }
      // For other modes, mark as answered with empty selection
      const currentQ = state.questions[state.currentIndex]
      if (!currentQ) return state
      return {
        ...state,
        status: 'answered',
        answers: {
          ...state.answers,
          [currentQ.id]: [],
        },
        streak: 0,
        bestStreak: state.bestStreak,
        lives:
          state.mode === 'survival'
            ? Math.max(0, state.lives - 1)
            : state.lives,
      }
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

      return {
        ...state,
        status: 'answered',
        score: state.score + (isCorrect ? action.payload.scoreDelta : 0),
        streak: isCorrect ? state.streak + 1 : 0,
        bestStreak: isCorrect
          ? Math.max(state.bestStreak, state.streak + 1)
          : state.bestStreak,
        lives: isCorrect
          ? state.lives
          : Math.max(0, state.lives - 1),
      }
    }

    case 'SKIP_QUESTION': {
      // Skip: no score, streak reset, lose life in survival
      return {
        ...state,
        status: 'answered',
        streak: 0,
        bestStreak: state.bestStreak,
        lives:
          state.mode === 'survival'
            ? Math.max(0, state.lives - 1)
            : state.lives,
      }
    }

    case 'NEXT_QUESTION': {
      const nextIndex = state.currentIndex + 1
      if (nextIndex >= state.questions.length) {
        return { ...state, status: 'finished' }
      }
      // Reset timeRemaining for timed mode (10s per remaining question)
      const remainingQuestions = state.config.questionCount - nextIndex
      const timeRemaining =
        state.mode === 'timed'
          ? remainingQuestions * 10
          : state.timeRemaining
      return {
        ...state,
        currentIndex: nextIndex,
        status: 'playing',
        timeRemaining,
      }
    }

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
      }

    case 'RESET':
      return {
        ...createInitialState(state.config),
        status: 'idle',
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

  startLoading: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'START_LOADING' }) })),
  loadQuestions: (questions, config) =>
    set((s) => ({
      ...sessionReducer(s, {
        type: 'LOAD_QUESTIONS',
        payload: { questions, config },
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
  timeUp: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'TIME_UP' }) })),
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
    set((s) => ({ ...sessionReducer(s, { type: 'SUBMIT_ANSWER', payload: { scoreDelta } }) })),
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
      const mistakes: SessionResult['mistakes'] = []
      for (const q of s.questions) {
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
        incorrectCount: s.questions.length - correctCount,
        totalQuestions: s.questions.length,
        timeSpent,
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
  setBlitzTimeElapsed: (elapsed) =>
    set((s) => ({ ...s, blitzTimeElapsed: elapsed })),
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
}))
