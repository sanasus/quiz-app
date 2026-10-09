/**
 * Zod schemas for QuizAPI responses.
 * Based on docs/api-notes.md — browse mode format with answer_a/answer_b keys.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Single QuizApiQuestion (browse mode — array-of-answers format)
// ---------------------------------------------------------------------------

export const quizApiAnswerSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
})

export type QuizApiAnswer = z.infer<typeof quizApiAnswerSchema>

export const quizApiQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  explanation: z.string().nullable().optional(),
  tags: z.array(z.object({ name: z.string() })).optional(),
  category: z.string().nullable().optional(),
  // Fields that may or may not be present
  quizId: z.string().optional(),
  quizTitle: z.string().optional(),
  // The old browse-mode fields (for backwards compat with docs)
  answers: z
    .discriminatedUnion('type', [
      z.object({ id: z.string(), text: z.string(), isCorrect: z.boolean() }),
    ])
    .array(),
  multiple_correct_answers: z.enum(['true', 'false']).optional(),
  correct_answers: z.record(z.string(), z.enum(['true', 'false'])).optional(),
  description: z.string().nullable().optional(),
  tip: z.string().nullable().optional(),
})

export type QuizApiQuestion = z.infer<typeof quizApiQuestionSchema>

// ---------------------------------------------------------------------------
// Wrapped response: { success: true, data: QuizApiQuestion[] }
// ---------------------------------------------------------------------------

export const quizApiListSchema = z.object({
  success: z.literal(true),
  data: z.array(quizApiQuestionSchema),
  meta: z
    .object({
      total: z.number().optional(),
      pageTotal: z.number().optional(),
      page: z.number().optional(),
      lastPage: z.number().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      links: z
        .object({
          first: z.string().optional(),
          last: z.string().optional(),
          next: z.string().nullable().optional(),
          prev: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
})

export type QuizApiList = z.infer<typeof quizApiListSchema>

// ---------------------------------------------------------------------------
// Error response: { success: false, error: string }
// ---------------------------------------------------------------------------

export const quizApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

export type QuizApiError = z.infer<typeof quizApiErrorSchema>

// ---------------------------------------------------------------------------
// Categories response: { success: true, data: Topic[] }
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable().optional(),
  quizCount: z.number().optional(),
})

export const topicSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable().optional(),
  categories: z.array(categorySchema),
})

export const categoriesApiResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(topicSchema),
})

export type CategoryApi = z.infer<typeof categorySchema>
export type TopicApi = z.infer<typeof topicSchema>
export type CategoriesApiResponse = z.infer<typeof categoriesApiResponseSchema>

// ---------------------------------------------------------------------------
// Metadata response: { success: true, data: Metadata }
// ---------------------------------------------------------------------------

export const metadataApiResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    difficulties: z.array(z.string()),
    questionTypes: z.array(z.string()),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
    stats: z.object({
      totalQuizzes: z.number(),
      totalQuestions: z.number(),
    }),
  }),
})

export type MetadataApiResponse = z.infer<typeof metadataApiResponseSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type guard: is this a successful list response? */
export function isSuccessList(data: unknown): data is QuizApiList {
  return quizApiListSchema.safeParse(data).success
}

/** Type guard: is this an error response? */
export function isErrorResponse(data: unknown): data is QuizApiError {
  return quizApiErrorSchema.safeParse(data).success
}
