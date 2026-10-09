/**
 * Zod schemas for QuizAPI responses.
 * Based on docs/api-notes.md — browse mode format with answer_a/answer_b keys.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Answer keys: answer_a, answer_b, … up to answer_f
// ---------------------------------------------------------------------------

const VALID_ANSWER_KEYS = [
  'answer_a',
  'answer_b',
  'answer_c',
  'answer_d',
  'answer_e',
  'answer_f',
] as const

const VALID_CORRECT_KEYS: ReadonlyArray<string> = VALID_ANSWER_KEYS.map((k) => `${k}_correct`)

/** Validate that all keys in an object are valid answer keys. */
function hasValidAnswerKeys(obj: Record<string, string>): boolean {
  return Object.keys(obj).every((k) => VALID_ANSWER_KEYS.includes(k as typeof VALID_ANSWER_KEYS[number]))
}

/** Validate that all keys in an object are valid correct-answer keys. */
function hasValidCorrectKeys(obj: Record<string, string>): boolean {
  return Object.keys(obj).every((k) => VALID_CORRECT_KEYS.includes(k as typeof VALID_CORRECT_KEYS[number]))
}

// ---------------------------------------------------------------------------
// Single QuizApiQuestion (browse mode)
// ---------------------------------------------------------------------------

export const quizApiQuestionSchema = z.object({
  id: z.number(),
  question: z.string().min(1),
  description: z.string().nullable(),
  answers: z.record(z.string(), z.string()).refine(hasValidAnswerKeys, {
    message: 'answers keys must be subset of answer_a…answer_f',
  }),
  multiple_correct_answers: z.enum(['true', 'false']),
  correct_answers: z.record(z.string(), z.enum(['true', 'false'])).refine(hasValidCorrectKeys, {
    message: 'correct_answers keys must be subset of answer_a_correct…answer_f_correct',
  }),
  explanation: z.string().nullable(),
  tip: z.string().nullable(),
  tags: z.array(z.object({ name: z.string() })),
  category: z.string(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
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
