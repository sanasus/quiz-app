/**
 * Shared types for the quiz application.
 */

// ---------------------------------------------------------------------------
// Question (internal model, after adapter)
// ---------------------------------------------------------------------------

export interface Question {
  id: string
  text: string
  description?: string
  explanation?: string
  options: { id: string; text: string }[]
  correctOptionIds: string[]
  multiple: boolean
  category?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

// ---------------------------------------------------------------------------
// Quiz mode
// ---------------------------------------------------------------------------

export type QuizMode = 'classic' | 'timed' | 'blitz' | 'survival'

// ---------------------------------------------------------------------------
// Session status (finite automaton)
// ---------------------------------------------------------------------------

export type SessionStatus =
  'idle' | 'loading' | 'playing' | 'answered' | 'finished'

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export interface QuizSession {
  status: SessionStatus
  questions: Question[]
  currentIndex: number
  answers: Record<string, string[]> // questionId -> selected option ids
  score: number
  streak: number
  bestStreak: number
  lives: number
  timeSpent: number // seconds
  mode: QuizMode
  config: QuizConfig
  // Mode-specific timers
  timeRemaining?: number // timed/blitz mode: seconds left on current question
  // Survival batch loading: no more question batches will arrive
  questionsExhausted: boolean
  // Repeat-mistakes support
  repeatConfig: QuizConfig | null
}

// ---------------------------------------------------------------------------
// Quiz config (from /setup)
// ---------------------------------------------------------------------------

export interface QuizConfig {
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  mode: QuizMode
}

// ---------------------------------------------------------------------------
// Session action (for Zustand useReducer-like pattern)
// ---------------------------------------------------------------------------

export type SessionAction =
  | { type: 'START_LOADING' }
  | {
      type: 'LOAD_QUESTIONS'
      payload: { questions: Question[]; config: QuizConfig }
    }
  | { type: 'START_PLAYING' }
  | { type: 'START_TIMER'; payload: { timeRemaining: number } }
  | { type: 'TIMER_TICK' }
  | { type: 'TIME_UP' }
  | { type: 'SELECT_OPTION'; payload: { questionId: string; optionId: string } }
  | { type: 'SUBMIT_ANSWER'; payload: { scoreDelta: number } }
  | { type: 'NEXT_QUESTION' }
  | {
      type: 'FINISH_SESSION'
      payload: { score: number; timeSpent: number; correctCount: number }
    }
  | { type: 'LOSE_LIFE' }
  | { type: 'APPEND_QUESTIONS'; payload: { questions: Question[] } }
  | { type: 'MARK_QUESTIONS_EXHAUSTED' }
  | {
      type: 'REPEAT_MISTAKES'
      payload: { questions: Question[]; config: QuizConfig }
    }
  | { type: 'SKIP_QUESTION' }
  | {
      type: 'UPDATE_CONFIG'
      payload: Partial<QuizConfig>
    }
  | { type: 'RESET' }
  | { type: 'RESET_BLITZ_TIMER' }

// ---------------------------------------------------------------------------
// Category (from API)
// ---------------------------------------------------------------------------

export interface Category {
  id: string
  name: string
  slug: string
  icon?: string | null
  quizCount?: number
}

export interface Topic {
  id: string
  name: string
  slug: string
  icon?: string | null
  categories: Category[]
}

// ---------------------------------------------------------------------------
// API metadata
// ---------------------------------------------------------------------------

export interface ApiMetadata {
  difficulties: string[]
  questionTypes: string[]
  categories: string[]
  tags: string[]
  stats: {
    totalQuizzes: number
    totalQuestions: number
  }
}

// ---------------------------------------------------------------------------
// Session result (for /results screen)
// ---------------------------------------------------------------------------

export interface SessionResult {
  score: number
  correctCount: number
  incorrectCount: number
  totalQuestions: number
  timeSpent: number
  mode: QuizMode
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  mistakes: { question: Question; selectedOptionIds: string[] }[]
}
