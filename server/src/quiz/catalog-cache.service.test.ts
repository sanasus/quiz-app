/**
 * CatalogCacheService — per-provider TTL cache.
 *
 * The TTL is the whole point: the setup screen re-mounts (and the
 * provider switch re-fetches) far more often than upstream categories
 * actually change, so a too-short TTL would defeat the cache and a
 * too-long one would pin stale data after a category is removed.
 * Failures are deliberately never cached.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogCacheService, CATALOG_TTL_MS } from './catalog-cache.service'
import type { Catalog } from './types'

const catalog: Catalog = {
  difficulties: ['easy'],
  topics: [
    {
      id: 't1',
      name: 'Science',
      slug: 'science',
      categories: [
        { id: 'c1', name: 'Physics', slug: 'physics', quizCount: 3 },
      ],
    },
  ],
}

describe('CatalogCacheService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns undefined for a provider that was never cached', () => {
    expect(new CatalogCacheService().get('quizapi')).toBeUndefined()
  })

  it('serves the stored catalog back to the same provider', () => {
    const cache = new CatalogCacheService()
    cache.set('quizapi', catalog)

    expect(cache.get('quizapi')).toBe(catalog)
  })

  it('keeps providers independent — a hit for one is not a hit for the other', () => {
    const cache = new CatalogCacheService()
    cache.set('quizapi', catalog)

    expect(cache.get('trivia')).toBeUndefined()
  })

  it('expires an entry exactly at the TTL', () => {
    const cache = new CatalogCacheService()
    cache.set('quizapi', catalog)

    // Just inside the window it is still served…
    vi.advanceTimersByTime(CATALOG_TTL_MS - 1)
    expect(cache.get('quizapi')).toBe(catalog)

    // …and gone the moment it lapses, not on the next set.
    vi.advanceTimersByTime(1)
    expect(cache.get('quizapi')).toBeUndefined()
  })

  it('drops a lapsed entry instead of serving it, and forgets it entirely', () => {
    const cache = new CatalogCacheService()
    cache.set('quizapi', catalog)
    vi.advanceTimersByTime(CATALOG_TTL_MS)

    expect(cache.get('quizapi')).toBeUndefined()
    // The expired entry was evicted, not merely hidden.
    expect(cache.invalidate('quizapi')).toBeUndefined()
  })

  it('invalidate clears one provider, clear() empties the cache', () => {
    const cache = new CatalogCacheService()
    cache.set('quizapi', catalog)
    cache.set('trivia', catalog)

    cache.invalidate('quizapi')
    expect(cache.get('quizapi')).toBeUndefined()
    expect(cache.get('trivia')).toBe(catalog)

    cache.clear()
    expect(cache.get('trivia')).toBeUndefined()
  })

  it('set() replaces an existing entry (refresh restarts the TTL)', () => {
    const cache = new CatalogCacheService()
    const refreshed: Catalog = { difficulties: ['hard'], topics: [] }

    cache.set('quizapi', catalog)
    vi.advanceTimersByTime(CATALOG_TTL_MS - 1)
    cache.set('quizapi', refreshed)

    // The new TTL counts from the refresh, not the original set.
    vi.advanceTimersByTime(CATALOG_TTL_MS - 1)
    expect(cache.get('quizapi')).toBe(refreshed)
  })
})
