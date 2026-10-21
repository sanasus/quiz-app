/**
 * Blitz mode — timer per question, resets on each new question.
 * Timer runs out = wrong answer, auto-submit, advance to next.
 */

import type { GameMode } from './mode'
import type { QuizSession } from '../../shared/types/quiz'

/** Fixed time per question, in seconds. */
export const BLITZ_TIME_LIMIT = 10

export const BlitzMode: GameMode = {
  id: 'blitz',
  timeLimitPerQuestion: null,
  timerLimit: BLITZ_TIME_LIMIT,
  timerBehavior: 'per-question',
  lives: null,
  headerType: 'timer',

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
      timeRemaining: BLITZ_TIME_LIMIT,
    }
  },

  onQuestionAdvance: (state: QuizSession): Partial<QuizSession> => ({
    currentIndex: state.currentIndex + 1,
    status: 'playing',
    timeRemaining: BLITZ_TIME_LIMIT,
  }),

  onWrongAnswer: (): Partial<QuizSession> => ({}),

  onCorrectAnswer: (): Partial<QuizSession> => ({}),
}
