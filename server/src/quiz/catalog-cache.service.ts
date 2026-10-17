/**
 * In-memory TTL cache for /api/quiz/catalog.
 *
 * Categories and difficulties change at most daily on either upstream,
 * and the setup screen can re-mount (or re-validate) often during a
 * provider switch — a short-lived per-provider cache absorbs that
 * without hammering the APIs. The cache is per-process: the proxy is
 * stateless beyond this, so a restart simply refills.
 *
 * Failures are never cached — a broken provider must keep failing
 * visibly so the client can auto-switch, not be handed a stale copy.
 */

import { Injectable } from '@nestjs/common'
import type { Catalog, QuestionsQuery } from './types'
import type { UpstreamProviderId } from './providers/provider.interface'

/** Catalog changes at most daily upstream — 1 hour is plenty. */
export const CATALOG_TTL_MS = 60 * 60 * 1000

interface CacheEntry {
  catalog: Catalog
  expiresAt: number
}

@Injectable()
export class CatalogCacheService {
  private readonly entries = new Map<UpstreamProviderId, CacheEntry>()

  /** Stale-while-fresh: `undefined` when missing or past its TTL. */
  get(provider: UpstreamProviderId): Catalog | undefined {
    const entry = this.entries.get(provider)
    if (!entry) return undefined
    if (Date.now() >= entry.expiresAt) {
      this.entries.delete(provider)
      return undefined
    }
    return entry.catalog
  }

  set(provider: UpstreamProviderId, catalog: Catalog): void {
    this.entries.set(provider, {
      catalog,
      expiresAt: Date.now() + CATALOG_TTL_MS,
    })
  }

  /** Drop one provider's entry (used on tests and future invalidation). */
  invalidate(provider: UpstreamProviderId): void {
    this.entries.delete(provider)
  }

  clear(): void {
    this.entries.clear()
  }
}

/**
 * Catalogs are keyed by provider only, but the questions page varies by
 * every query dimension — this helper builds that key so the questions
 * path (uncached today) can adopt the same cache later without
 * re-deriving the shape. Kept for symmetry and tested for stability.
 */
export function questionsCacheKey(query: QuestionsQuery): string {
  return [query.category, query.difficulty, query.limit, query.offset].join('|')
}
