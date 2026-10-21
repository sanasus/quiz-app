/**
 * Zod schema of the persisted quiz session (sessionStorage).
 *
 * Mirrors `QuizSession` + `finishedSession` + `sessionStartTime`; the
 * store validates a stored payload against it before trusting it.
 */

import { z } from 'zod'

const difficultySchema = z.enum(['easy', 'medium', 'hard'])
const modeSchema = z.enum(['classic', 'timed', 'blitz', 'survival'])

export const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  description: z.string().optional(),
  explanation: z.string().optional(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  correctOptionIds: z.array(z.string()),
  category: z.string().optional(),
  difficulty: difficultySchema,
})

const configSchema = z.object({
  category: z.string(),
  difficulty: difficultySchema,
  questionCount: z.number(),
  mode: modeSchema,
})

const sessionResultSchema = z.object({
  score: z.number(),
  correctCount: z.number(),
  incorrectCount: z.number(),
  totalQuestions: z.number(),
  timeSpent: z.number(),
  bestStreak: z.number(),
  finishedAt: z.number(),
  mode: modeSchema,
  difficulty: difficultySchema,
  category: z.string(),
  attempts: z.array(
    z.object({
      question: questionSchema,
      selectedOptionIds: z.array(z.string()),
      correct: z.boolean(),
    }),
  ),
  livesLeft: z.number(),
})

export const persistedSessionSchema = z.object({
  status: z.enum(['idle', 'loading', 'playing', 'answered', 'finished']),
  questions: z.array(questionSchema),
  currentIndex: z.number().int().nonnegative(),
  answers: z.record(z.string(), z.array(z.string())),
  score: z.number(),
  streak: z.number(),
  bestStreak: z.number(),
  lives: z.number(),
  timeSpent: z.number(),
  mode: modeSchema,
  config: configSchema,
  timeRemaining: z.number().optional(),
  questionsExhausted: z.boolean(),
  questionsTotal: z.number().optional(),
  poolStart: z.number().int().nonnegative(),
  poolConsumed: z.number().int().nonnegative(),
  finishedSession: sessionResultSchema.nullable(),
  sessionStartTime: z.number().nullable(),
  /** Epoch ms of the write; shifts `sessionStartTime` on restore. */
  savedAt: z.number(),
})

export type PersistedSession = z.infer<typeof persistedSessionSchema>
