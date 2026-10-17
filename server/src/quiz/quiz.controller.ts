/**
 * QuizController — the proxy's whole surface area: two GET endpoints.
 *
 *   GET /api/quiz/questions?provider=&category=&difficulty=&limit=&offset=
 *   GET /api/quiz/catalog?provider=
 *
 * Every query passes the zod pipe first, so the service only ever sees
 * a typed, clamped query. Upstream failures surface as UpstreamError
 * and are converted to the typed envelope by UpstreamErrorFilter —
 * the controller itself never builds an error response.
 *
 * The mock provider deliberately has no endpoint here: it is a client
 * -side concern (VITE_USE_MOCK_DATA) so e2e/CI stay hermetic without a
 * server round-trip.
 */

import { Controller, Get, Query } from '@nestjs/common'
import type { Catalog, QuestionsPage, QuestionsQuery } from './types'
import {
  catalogQuerySchema,
  questionsQuerySchema,
  type CatalogQueryInput,
  type QuestionsQueryInput,
} from './query.schema'
import { ZodValidationPipe } from './zod-validation.pipe'
import { QuizService } from './quiz.service'

@Controller('quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Get('questions')
  getQuestions(
    @Query(new ZodValidationPipe(questionsQuerySchema))
    query: QuestionsQueryInput,
  ): Promise<QuestionsPage> {
    return this.quiz.fetchQuestions(query.provider, toQuestionsQuery(query))
  }

  @Get('catalog')
  getCatalog(
    @Query(new ZodValidationPipe(catalogQuerySchema))
    query: CatalogQueryInput,
  ): Promise<Catalog> {
    return this.quiz.fetchCatalog(query.provider)
  }
}

/** Query-input → domain query (they are shape-compatible; kept apart so the DTO can drift). */
function toQuestionsQuery(input: QuestionsQueryInput): QuestionsQuery {
  return {
    category: input.category,
    difficulty: input.difficulty,
    limit: input.limit,
    offset: input.offset,
  }
}
