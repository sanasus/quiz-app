/**
 * Raw QuizAPI (https://quizapi.io/api/v1) response schemas.
 *
 * Trimmed to the fields the adaptation actually consumes. Zod ignores
 * unknown keys by default, so upstream adding fields never breaks
 * validation — only a changed shape of a *used* field does.
 */

import { z } from 'zod'

export const quizApiAnswerSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
})

export const quizApiQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  explanation: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  // Browse-mode array-of-answers format.
  answers: z.array(quizApiAnswerSchema),
})

export type QuizApiQuestion = z.infer<typeof quizApiQuestionSchema>

/** `meta.total` — exact pool size under the request filters. */
export const quizApiMetaSchema = z.object({
  total: z.number().optional(),
})

/** /categories — hierarchical topics → leaf categories. */
export const quizApiCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable().optional(),
  quizCount: z.number().optional(),
})

export const quizApiTopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable().optional(),
  categories: z.array(quizApiCategorySchema),
})

export const quizApiCategoriesResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(quizApiTopicSchema),
})

export type QuizApiTopic = z.infer<typeof quizApiTopicSchema>

/** /metadata — difficulty / type / category availability. */
export const quizApiMetadataResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    difficulties: z.array(z.string()),
    questionTypes: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
})
