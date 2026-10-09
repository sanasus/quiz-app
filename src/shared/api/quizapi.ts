/**
 * QuizAPI client + TanStack Query hooks.
 *
 * Base URL: https://quizapi.io/api/v1
 * Auth: Authorization: Bearer VITE_QUIZAPI_KEY
 */

import { useQuery } from '@tanstack/react-query'
import type {
  Question,
  QuizConfig,
  QuizSession,
  SessionAction,
} from '../types/quiz'
import { adaptQuestions } from './adapter'
import { quizApiQuestionSchema } from './schemas'

// ---------------------------------------------------------------------------
// Raw fetch helpers (called by hooks)
// ---------------------------------------------------------------------------

const API_BASE = 'https://quizapi.io/api/v1'

/** Read the API key from Vite env. */
function getApiKey(): string {
  const key = import.meta.env.VITE_QUIZAPI_KEY
  if (!key) {
    throw new Error(
      'VITE_QUIZAPI_KEY is not set. Create a .env file with your QuizAPI key.',
    )
  }
  return key
}

async function fetchQuestions(config: QuizConfig): Promise<Question[]> {
  const params = new URLSearchParams({
    limit: String(config.questionCount),
    difficulty: config.difficulty.toUpperCase(),
    random: 'true',
  })

  if (config.category && config.category !== 'all') {
    params.set('category', config.category)
  }

  const url = `${API_BASE}/questions?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid or expired API key.')
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') ?? '60'
    throw new Error(`Rate limit exceeded. Try again in ${retryAfter}s.`)
  }

  if (!response.ok) {
    throw new Error(`QuizAPI error: HTTP ${response.status}`)
  }

  const json = await response.json()

  // The API returns { success: true, data: [...] }
  const rawArray = json.data ?? []

  // Validate each item
  const valid: Question[] = []
  for (const raw of rawArray) {
    const parseResult = quizApiQuestionSchema.safeParse(raw)
    if (parseResult.success) {
      const adapted = adaptQuestions([parseResult.data])
      valid.push(...adapted)
    }
  }

  return valid
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

const QUESTIONS_QUERY_KEY = ['quiz', 'questions'] as const

export function useQuizQuestions(config: QuizConfig | null) {
  return useQuery({
    queryKey: [...QUESTIONS_QUERY_KEY, config],
    queryFn: () => {
      if (!config) throw new Error('Quiz config is required')
      return fetchQuestions(config)
    },
    enabled: config !== null,
    retry: (count, error) => {
      // Don't retry on 401/403
      if (error.message.includes('Invalid or expired')) return false
      return count < 2
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// Session store (Z Zustand)
// ---------------------------------------------------------------------------

import { create } from 'zustand'

const DEFAULT_LIVES = 3

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

    case 'SELECT_OPTION': {
      const { questionId, optionId } = action.payload
      const currentAnswers =
        state.answers[state.questions[state.currentIndex]?.id ?? ''] ?? []
      const question = state.questions[state.currentIndex]
      if (!question) return state

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
        status: 'answered',
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

      // Calculate if correct (exact match for multiple, any match for single)
      const isCorrect =
        question.correctOptionIds.length === selected.length &&
        question.correctOptionIds.every((id) => selected.includes(id))

      // Calculate score (placeholder — will be replaced by scoring.ts)
      const baseScore =
        question.correctOptionIds.length === selected.length ? 10 : 0

      return {
        ...state,
        status: 'playing',
        score: state.score + baseScore,
        streak: isCorrect ? state.streak + 1 : 0,
        bestStreak: isCorrect
          ? Math.max(state.bestStreak, state.streak + 1)
          : state.bestStreak,
        lives: isCorrect ? state.lives : Math.max(0, state.lives - 1),
      }
    }

    case 'NEXT_QUESTION': {
      const nextIndex = state.currentIndex + 1
      if (nextIndex >= state.questions.length) {
        return { ...state, status: 'finished' }
      }
      return { ...state, currentIndex: nextIndex, status: 'playing' }
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
      }

    case 'RESET':
      return createInitialState(state.config)

    default:
      return state
  }
}

interface QuizStore extends QuizSession {
  // Actions
  startLoading: () => void
  loadQuestions: (questions: Question[], config: QuizConfig) => void
  startPlaying: () => void
  selectOption: (optionId: string) => void
  submitAnswer: () => void
  nextQuestion: () => void
  finishSession: (
    score: number,
    timeSpent: number,
    correctCount: number,
  ) => void
  loseLife: () => void
  repeatMistakes: (
    mistakes: { question: Question; selectedOptionIds: string[] }[],
    config: QuizConfig,
  ) => void
  reset: () => void
}

export const useQuizStore = create<QuizStore>((set) => ({
  ...createInitialState({
    category: 'all',
    difficulty: 'easy',
    questionCount: 10,
    mode: 'classic',
  }),
  reducer: sessionReducer,

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
  submitAnswer: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'SUBMIT_ANSWER' }) })),
  nextQuestion: () =>
    set((s) => ({ ...sessionReducer(s, { type: 'NEXT_QUESTION' }) })),
  finishSession: (score, timeSpent, correctCount) =>
    set((s) => ({
      ...sessionReducer(s, {
        type: 'FINISH_SESSION',
        payload: { score, timeSpent, correctCount },
      }),
    })),
  loseLife: () => set((s) => ({ ...sessionReducer(s, { type: 'LOSE_LIFE' }) })),
  repeatMistakes: (mistakes, config) => {
    const questions = mistakes.map((m) => m.question)
    set((s) => ({
      ...sessionReducer(s, {
        type: 'REPEAT_MISTAKES',
        payload: { questions, config },
      }),
    }))
  },
  reset: () => set((s) => ({ ...sessionReducer(s, { type: 'RESET' }) })),
}))
