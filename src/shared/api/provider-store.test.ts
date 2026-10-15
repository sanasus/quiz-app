/**
 * Provider store (provider-store.ts): persisted provider choice with
 * zod-validated rehydrate — corrupt data falls back to the default,
 * mock mode always forces 'mock' (dev/e2e must never hit a live API).
 *
 * Module-level constants (USE_MOCK, DEFAULT_PROVIDER_ID) are captured
 * at import time, so env-dependent cases use vi.resetModules() +
 * dynamic import — the same pattern as providers.test.ts.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PROVIDER_ID } from './providers'
import { useProviderStore } from './provider-store'

const STORAGE_KEY = 'quiz-provider'

/** Seed localStorage the way the persist middleware left it. */
function seedPersistedProvider(providerId: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ state: { providerId }, version: 1 }),
  )
}

/** providerId of the freshly imported store (post-rehydrate). */
async function importFreshProviderId(): Promise<string> {
  vi.resetModules()
  const mod = await import('./provider-store')
  return mod.useProviderStore.getState().providerId
}

describe('useProviderStore', () => {
  beforeEach(() => {
    localStorage.clear()
    // The statically imported store lives across tests — reset it.
    useProviderStore.setState({ providerId: DEFAULT_PROVIDER_ID })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    localStorage.clear()
  })

  it('defaults to DEFAULT_PROVIDER_ID', () => {
    expect(useProviderStore.getState().providerId).toBe(DEFAULT_PROVIDER_ID)
    // Vitest runs with .env VITE_USE_MOCK_DATA=false → live quizapi.
    expect(DEFAULT_PROVIDER_ID).toBe('quizapi')
  })

  it('setProviderId switches the active provider', () => {
    useProviderStore.getState().setProviderId('trivia')
    expect(useProviderStore.getState().providerId).toBe('trivia')

    useProviderStore.getState().setProviderId('mock')
    expect(useProviderStore.getState().providerId).toBe('mock')
  })

  it('persists the choice under the quiz-provider key', () => {
    useProviderStore.getState().setProviderId('trivia')

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toMatchObject({
      state: { providerId: 'trivia' },
      version: 1,
    })
  })

  it('rehydrates a valid persisted provider', async () => {
    seedPersistedProvider('trivia')

    expect(await importFreshProviderId()).toBe('trivia')
  })

  it('falls back to the default when the persisted value is corrupt', async () => {
    seedPersistedProvider('unknown')

    expect(await importFreshProviderId()).toBe(DEFAULT_PROVIDER_ID)
  })

  it('falls back to the default when the persisted shape is wrong', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }))

    expect(await importFreshProviderId()).toBe(DEFAULT_PROVIDER_ID)
  })

  it('forces mock in mock mode even when trivia is persisted', async () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'true')
    seedPersistedProvider('trivia')

    expect(await importFreshProviderId()).toBe('mock')
  })
})
