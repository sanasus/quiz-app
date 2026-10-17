/**
 * Query contract for the two endpoints.
 *
 * Zod is used directly (no class-validator) so validation stays in the
 * same language as the rest of the domain logic and can be reused for
 * the e2e fixtures.
 *
 * Missing params fall back to their default; *present but malformed*
 * params fail with 400 — a broken client request is not a reason to
 * silently substitute values, and it must never wear the provider error
 * envelope (that envelope means "a provider is broken, consider
 * switching", which is not what happened here).
 */

import { z } from 'zod'
import { UPSTREAM_PROVIDER_IDS } from './providers/provider-registry'

/** Difficulty levels the app supports end to end. */
const difficultySchema = z.enum(['easy', 'medium', 'hard'])

/**
 * The category the client picked. Capped rather than pattern-matched:
 * the value only ever becomes an upstream query param (URLSearchParams
 * encodes it, so there is no injection), and the two providers spell
 * slugs differently — trivia uses underscores (`general_knowledge`)
 * while quizapi uses bare words, so a charset rule would reject
 * legitimate requests.
 */
const categorySchema = z.string().max(64)

/**
 * GET /api/quiz/questions — the client computes limit/offset (survival
 * batches), so the server stays stateless. limit is bounded so a rogue
 * client cannot ask the upstream for an unbounded page.
 */
export const questionsQuerySchema = z.object({
  provider: z.enum(UPSTREAM_PROVIDER_IDS),
  category: categorySchema.default('all'),
  difficulty: difficultySchema,
  limit: z.coerce.number().int().min(1).max(200).default(10),
  offset: z.coerce.number().int().min(0).default(0),
})

export type QuestionsQueryInput = z.infer<typeof questionsQuerySchema>

/** GET /api/quiz/catalog — only the provider is required. */
export const catalogQuerySchema = z.object({
  provider: z.enum(UPSTREAM_PROVIDER_IDS),
})

export type CatalogQueryInput = z.infer<typeof catalogQuerySchema>
