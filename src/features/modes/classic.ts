/**
 * Classic mode — no timers, no lives, just answer questions.
 */

import type { GameMode } from './mode'
import type { QuizSession } from '../../shared/types/quiz'

export const ClassicMode: GameMode = {
  id: 'classic',
  timeLimitPerQuestion: null,
  timerLimit: null,
  timerBehavior: 'none',
  lives: null,
  autoSubmitOnSelection: false,
  headerType: 'none',

  onTimeUp: (): Partial<QuizSession> => ({
    status: 'finished',
    timeRemaining: 0,
  }),

  onQuestionAdvance: (state: QuizSession): Partial<QuizSession> => ({
    currentIndex: state.currentIndex + 1,
    status: 'playing',
  }),

  onSkip: (state: QuizSession): Partial<QuizSession> => ({
    status: 'answered',
    streak: 0,
    bestStreak: state.bestStreak,
  }),

  onWrongAnswer: (): Partial<QuizSession> => ({}),

  onCorrectAnswer: (): Partial<QuizSession> => ({}),
}
