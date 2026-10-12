/**
 * Blitz mode — timer per question, resets on each new question.
 * Timer runs out = wrong answer, auto-submit, advance to next.
 */

import type { GameMode } from './mode'
import type { QuizSession } from '../../shared/types/quiz'
import { getBlitzTimeLimit } from '../../shared/lib/session-store'

export const BlitzMode: GameMode = {
  id: 'blitz',
  timeLimitPerQuestion: null,
  timerLimit: getBlitzTimeLimit,
  timerBehavior: 'per-question',
  lives: null,
  autoSubmitOnSelection: true,
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
      timeRemaining: getBlitzTimeLimit(state.questions.length),
    }
  },

  onQuestionAdvance: (state: QuizSession): Partial<QuizSession> => ({
    currentIndex: state.currentIndex + 1,
    status: 'playing',
    timeRemaining: getBlitzTimeLimit(state.questions.length),
  }),

  onSkip: (state: QuizSession): Partial<QuizSession> => ({
    status: 'answered',
    streak: 0,
    bestStreak: state.bestStreak,
    timeRemaining: getBlitzTimeLimit(state.questions.length),
  }),

  onWrongAnswer: (): Partial<QuizSession> => ({}),

  onCorrectAnswer: (): Partial<QuizSession> => ({}),
}
