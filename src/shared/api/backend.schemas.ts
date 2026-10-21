/**
 * Wire contracts for our own proxy (`/api/quiz/*`).
 *
 * These are the *client half* of the contract: the server has already
 * validated and cleaned the upstream payload, so the schemas here only
 * need to reject a malformed response from the proxy (a contract
 * break → kind `parse`) and infer the exact TS types the app consumes.
 *
 * Deliberately thinner than the raw upstream schemas they replaced: no
 * Bearer key, no per-provider raw shapes, no adaptation — all of that
 * lives on the server now (server/src/quiz/upstream/).
 */

import { z } from 'zod'

/** The three levels the internal model supports end to end. */
export const difficultySchema = z.enum(['easy', 'medium', 'hard'])

const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  // The server drops nulls to `undefined`, which JSON omits entirely —
  // so these keys are legitimately absent rather than nullable.
  description: z.string().optional(),
  explanation: z.string().optional(),
  // Adapters guarantee ≥2 distinct options and ≥1 correct answer; a
  // violation here means the proxy broke the contract.
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  correctOptionIds: z.array(z.string()).min(1),
  category: z.string().optional(),
  difficulty: difficultySchema,
})

export const questionsPageSchema = z.object({
  questions: z.array(questionSchema),
  /** Absent when the pool size is unknown (trivia's count can fail). */
  total: z.number().optional(),
})

export type BackendQuestionsPage = z.infer<typeof questionsPageSchema>

const catalogCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  quizCount: z.number().optional(),
})

const catalogTopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  categories: z.array(catalogCategorySchema),
})

/**
 * Merged metadata + categories. Difficulties arrive already narrowed to
 * the supported levels (the proxy drops EXPERT) and topics already
 * pruned (quizCount > 0) — the client still re-filters difficulties
 * because the mock provider bypasses the proxy with raw values.
 */
export const catalogSchema = z.object({
  difficulties: z.array(difficultySchema),
  topics: z.array(catalogTopicSchema),
})

export type BackendCatalog = z.infer<typeof catalogSchema>

/**
 * The typed failure envelope. `kind` is the single field the
 * provider-switch policy reads — the server derived it from the actual
 * upstream failure, so the client must not re-derive it from a status
 * code it cannot see (the proxy rewrites statuses on the way out).
 */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    kind: z.enum(['auth', 'rate_limit', 'parse', 'http', 'network', 'timeout']),
    providerId: z.enum(['quizapi', 'trivia']),
    status: z.number().optional(),
    retryAfter: z.number().optional(),
    message: z.string(),
  }),
})

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>
