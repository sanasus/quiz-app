/**
 * Raw The Trivia API (https://the-trivia-api.com/v2) response schemas.
 *
 * Trimmed to the fields the adaptation actually consumes.
 */

import { z } from 'zod'

export const triviaApiQuestionSchema = z.object({
  id: z.string(),
  question: z.object({ text: z.string().min(1) }),
  correctAnswer: z.string().min(1),
  incorrectAnswers: z.array(z.string()),
  category: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
})

export type TriviaApiQuestion = z.infer<typeof triviaApiQuestionSchema>

/** /questions/count — pool size under the same filters. */
export const triviaApiCountSchema = z.object({
  count: z.number(),
})

/**
 * /metadata — question counts per dimension. `byDifficulty` keys feed
 * the catalog's difficulty list; `byCategory` supplies per-category
 * quizCount and helps detect canonical slugs.
 */
export const triviaApiMetadataSchema = z.object({
  byCategory: z.record(z.string(), z.number()),
  byDifficulty: z.record(z.string(), z.number()),
  byType: z.record(z.string(), z.number()).optional(),
  byState: z.record(z.string(), z.number()).optional(),
})

export type TriviaApiMetadata = z.infer<typeof triviaApiMetadataSchema>

/** /categories — flat record: displayName → array of slug aliases. */
export const triviaApiCategoriesSchema = z.record(
  z.string(),
  z.array(z.string()).min(1),
)

export type TriviaApiCategories = z.infer<typeof triviaApiCategoriesSchema>
