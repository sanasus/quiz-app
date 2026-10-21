/**
 * Survival mode — 3 lives, lose one on wrong answer or timeout.
 * No timer.
 */

import type { GameMode } from './mode'
import type { QuizSession } from '../../shared/types/quiz'

const DEFAULT_LIVES = 3

export const SurvivalMode: GameMode = {
  id: 'survival',
  timeLimitPerQuestion: null,
  timerLimit: null,
  timerBehavior: 'none',
  lives: DEFAULT_LIVES,
  headerType: 'lives',

  onTimeUp: (state: QuizSession): Partial<QuizSession> => {
    const currentQ = state.questions[state.currentIndex]
    if (!currentQ) return {}

    const isLastQuestion = state.currentIndex >= state.questions.length - 1

    if (isLastQuestion) {
      return {
        status: 'finished',
        timeRemaining: 0,
        answers: {
          ...state.answers,
          [currentQ.id]: [],
        },
        streak: 0,
        bestStreak: state.bestStreak,
        lives: Math.max(0, state.lives - 1),
      }
    }

    return {
      status: 'answered',
      answers: {
        ...state.answers,
        [currentQ.id]: [],
      },
      streak: 0,
      bestStreak: state.bestStreak,
      lives: Math.max(0, state.lives - 1),
    }
  },

  onQuestionAdvance: (state: QuizSession): Partial<QuizSession> => {
    // 0 lives = run over: end the session instead of advancing, even if
    // more question batches are still loading.
    if (state.lives <= 0) return { status: 'finished' }
    return { currentIndex: state.currentIndex + 1, status: 'playing' }
  },

  onWrongAnswer: (state: QuizSession): Partial<QuizSession> => ({
    streak: 0,
    bestStreak: state.bestStreak,
    lives: Math.max(0, state.lives - 1),
  }),

  onCorrectAnswer: (): Partial<QuizSession> => ({}),
}
