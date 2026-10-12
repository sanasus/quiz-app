/**
 * Zod schema for the /quiz search params — shared between the route
 * and the quiz screen's config hook.
 */

import { z } from 'zod'

export const quizConfigSchema = z.object({
  category: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.coerce.number().min(1).max(50),
  mode: z.enum(['classic', 'timed', 'blitz', 'survival']),
})

export type QuizConfigInput = z.infer<typeof quizConfigSchema>
