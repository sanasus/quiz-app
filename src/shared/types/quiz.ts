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
  /**
   * Pool size under the current filters (API `meta.total`). Survival
   * shows it as the run's question count; undefined when unknown.
   */
  questionsTotal?: number
  /**
   * Cursor providers: pool position the run started from, and how many
   * raw pool items the loaded pages consumed since — the next survival
   * batch continues at `poolStart + poolConsumed`.
   */
  poolStart: number
  poolConsumed: number
  /**
   * The player asked for the next question while the next survival batch
   * was still loading: the advance is applied the moment the batch lands.
   */
  advancePending?: boolean
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
      payload: {
        questions: Question[]
        config: QuizConfig
        total?: number
        pool?: { start: number; consumed: number }
      }
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
  | {
      type: 'APPEND_QUESTIONS'
      payload: {
        questions: Question[]
        total?: number
        /** Raw pool items the batch consumed (cursor providers). */
        rawCount?: number
        /** The pool has nothing further; absent = infer from `added === 0`. */
        exhausted?: boolean
      }
    }
  | { type: 'MARK_QUESTIONS_EXHAUSTED' }
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

export interface SessionAttempt {
  question: Question
  /** Empty when the question timed out unanswered. */
  selectedOptionIds: string[]
  correct: boolean
}

export interface SessionResult {
  score: number
  correctCount: number
  incorrectCount: number
  totalQuestions: number
  timeSpent: number
  /** Longest correct-answer streak within the session. */
  bestStreak: number
  /** Epoch ms when the session finished (distinguishes consecutive sessions). */
  finishedAt: number
  mode: QuizMode
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  /** Every attempted question, in order, with the player's answer. */
  attempts: SessionAttempt[]
  /** Lives left at the end (meaningful for survival only). */
  livesLeft: number
}
