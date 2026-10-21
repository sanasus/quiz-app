/**
 * Timed mode — one shared timer for the entire session.
 * When it runs out, the session ends.
 */

import type { GameMode } from './mode'
import type { QuizSession } from '../../shared/types/quiz'

/** Timed mode: total time = questionCount * 10 seconds. */
function getTimedTotalLimit(questionCount: number): number {
  return questionCount * 10
}

export const TimedMode: GameMode = {
  id: 'timed',
  timeLimitPerQuestion: null,
  timerLimit: getTimedTotalLimit,
  timerBehavior: 'total',
  lives: null,
  headerType: 'timer',

  onTimeUp: (): Partial<QuizSession> => ({
    status: 'finished',
    timeRemaining: 0,
  }),

  onQuestionAdvance: (state: QuizSession): Partial<QuizSession> => ({
    currentIndex: state.currentIndex + 1,
    status: 'playing',
  }),

  onWrongAnswer: (): Partial<QuizSession> => ({}),

  onCorrectAnswer: (): Partial<QuizSession> => ({}),
}
