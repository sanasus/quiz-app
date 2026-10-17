/**
 * Mock provider — serves the static dev/e2e fixtures from mock-*.ts
 * through the QuizProvider fetchers. Never touches the network.
 */

import type { QuizConfig } from '../types/quiz'
import { countMockQuestions, fetchMockQuestions } from './mock-questions'
import { getInitialFetchLimit } from './fetch-limits'
import type { QuestionsFetchOptions, QuestionsPage } from './providers'

export { fetchMockCategories } from './mock-categories'
export { fetchMockMetadata } from './mock-data'

/**
 * One page of mock questions. `total` mirrors the live API's
 * `meta.total`: the filtered pool size before offset/limit slicing,
 * so survival can detect exhaustion the same way.
 */
export async function fetchMockQuestionsPage(
  config: QuizConfig,
  options: QuestionsFetchOptions = {},
): Promise<QuestionsPage> {
  return {
    questions: await fetchMockQuestions(
      options.limit ?? getInitialFetchLimit(config),
      config.difficulty,
      config.category,
      options.offset ?? 0,
    ),
    total: countMockQuestions(config.difficulty, config.category),
  }
}
