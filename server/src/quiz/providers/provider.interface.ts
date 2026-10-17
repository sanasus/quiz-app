/**
 * Provider contract implemented by each upstream adapter.
 *
 * Both methods are network-bound and throw UpstreamError on failure —
 * the HTTP exception filter (stage 3) turns that into the typed wire
 * envelope the client's provider-switch policy keys off.
 */

import type { Catalog, QuestionsPage, QuestionsQuery } from '../types'

/** The two live providers — the mock stays a client-side concern. */
export type UpstreamProviderId = 'quizapi' | 'trivia'

export interface QuizProvider {
  readonly id: UpstreamProviderId

  /**
   * One page of questions plus the pool size under the same filters.
   * An empty page at offset > 0 is a normal outcome (pool exhausted)
   * for a survival batch, not an error.
   */
  fetchQuestions(query: QuestionsQuery): Promise<QuestionsPage>

  /** Merged metadata + categories for the setup screen. */
  fetchCatalog(): Promise<Catalog>
}
