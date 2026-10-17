/**
 * QuizService — dispatch by provider + catalog caching.
 *
 * The controller stays thin: it validates the query and delegates here.
 * Catalogs go through a per-provider TTL cache; question pages are
 * always live (survival batches rely on fresh `total` and on new random
 * picks from the upstream).
 */

import { Injectable } from '@nestjs/common'
import type { Catalog, QuestionsPage, QuestionsQuery } from './types'
import type { UpstreamProviderId } from './providers/provider.interface'
import type { QuizProvider } from './providers/provider.interface'
// Value import, not `import type`: this class appears in the
// constructor's design:paramtypes metadata, and a type-only import is
// erased — Nest would then see `Object` and fail to inject it.
import { ProviderRegistry } from './providers/provider-registry'
import { CatalogCacheService } from './catalog-cache.service'

@Injectable()
export class QuizService {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly catalogCache: CatalogCacheService,
  ) {}

  async fetchQuestions(
    provider: UpstreamProviderId,
    query: QuestionsQuery,
  ): Promise<QuestionsPage> {
    return this.provider(provider).fetchQuestions(query)
  }

  /** Merged metadata + categories, cached ~1h per provider. */
  async fetchCatalog(provider: UpstreamProviderId): Promise<Catalog> {
    const cached = this.catalogCache.get(provider)
    if (cached) return cached

    const catalog = await this.provider(provider).fetchCatalog()
    this.catalogCache.set(provider, catalog)
    return catalog
  }

  private provider(id: UpstreamProviderId): QuizProvider {
    return this.registry.get(id)
  }
}
