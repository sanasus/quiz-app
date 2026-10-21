/**
 * GameMode — interface for quiz mode behavior.
 *
 * Each mode is a plain object implementing this interface, making modes
 * testable as pure functions with no Zustand / React dependencies.
 */

import type { QuizMode, QuizSession } from '../../shared/types/quiz'

export interface GameMode {
  /** Unique mode identifier */
  readonly id: QuizMode

  /** Time limit per question in seconds (null = no per-question timer) */
  readonly timeLimitPerQuestion: number | null

  /** Timer duration for modes with dynamic/resetting timers (null = no timer).
   *  Can be a static number or a function that computes the limit from question count. */
  readonly timerLimit: number | ((questionCount: number) => number) | null

  /** How the timer behaves: 'none' = no timer, 'per-question' = resets each question, 'total' = shared across session */
  readonly timerBehavior: 'none' | 'per-question' | 'total'

  /** Initial lives (null = infinite / not applicable) */
  readonly lives: number | null

  /** What the header should show for this mode */
  readonly headerType: 'timer' | 'lives' | 'none'

  /** Called when the per-question timer expires */
  onTimeUp: (state: QuizSession) => Partial<QuizSession>

  /** Called when advancing to the next question */
  onQuestionAdvance: (state: QuizSession) => Partial<QuizSession>

  /** Called when the user gives a wrong answer */
  onWrongAnswer: (state: QuizSession) => Partial<QuizSession>

  /** Called when the user gives a correct answer */
  onCorrectAnswer: (state: QuizSession) => Partial<QuizSession>
}
