/**
 * How many questions to request, and when.
 *
 * Kept separate from any one provider client: the live client and the
 * mock both paginate by offset, and survival's batch size is a product
 * decision that must stay in sync between them (the survival header,
 * the batch prefetch and the "first batch of 10" all read it).
 */

import type { QuizConfig } from '../types/quiz'

/**
 * Survival loads questions in batches of this size instead of fetching
 * the whole configured count up front (plan, Этап 3).
 */
export const SURVIVAL_BATCH_SIZE = 10

/**
 * How many questions are fetched up front. Survival ignores the
 * question-count setting entirely: it always starts with the first
 * batch, then pulls batches of SURVIVAL_BATCH_SIZE until the pool runs
 * out. Every other mode loads the full configured count.
 */
export function getInitialFetchLimit(config: QuizConfig): number {
  if (config.mode === 'survival') return SURVIVAL_BATCH_SIZE
  return config.questionCount
}
