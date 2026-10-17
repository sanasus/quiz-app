/**
 * Provider registry (providers.ts): lookup, alternation and the
 * switcher options — mock shows up only while it is the active
 * source. The provider-switch policy (T4–T8) keys off these, so
 * their shape is pinned here.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  alternateProviderId,
  getProvider,
  getSwitcherProviders,
  PROVIDERS,
} from './providers'

describe('getProvider', () => {
  it('returns every registered provider keyed by its id', () => {
    for (const id of ['quizapi', 'trivia', 'mock'] as const) {
      expect(getProvider(id).id).toBe(id)
    }
  })

  it('gives every provider the same two entry points', () => {
    // The proxy contract: one questions call, one merged catalog call.
    // Nothing client-side may own an API key or a third request shape.
    for (const id of ['quizapi', 'trivia', 'mock'] as const) {
      const provider = getProvider(id)
      expect(typeof provider.fetchQuestions).toBe('function')
      expect(typeof provider.fetchCatalog).toBe('function')
      expect(provider.labelKey).toBe(`provider.${id}`)
    }
  })

  it('exposes all three providers in the registry', () => {
    expect(Object.keys(PROVIDERS).sort()).toEqual(['mock', 'quizapi', 'trivia'])
  })
})

describe('alternateProviderId', () => {
  it('switches between the two live providers', () => {
    expect(alternateProviderId('quizapi')).toBe('trivia')
    expect(alternateProviderId('trivia')).toBe('quizapi')
  })

  it('leaves mock for the default live provider', () => {
    expect(alternateProviderId('mock')).toBe('quizapi')
  })
})

describe('fetchCatalog (mock)', () => {
  it('narrows the raw mock difficulties and keeps the category tree', async () => {
    // mock-data.ts serves 'EASY'…'EXPERT' raw, because the mock never
    // passes through the proxy. The registry must normalise them so
    // both providers expose one shape — otherwise the setup screen
    // would render no difficulty buttons at all.
    const catalog = await getProvider('mock').fetchCatalog()

    expect(catalog.difficulties).toEqual(['easy', 'medium', 'hard'])
    expect(catalog.topics.length).toBeGreaterThan(0)
    expect(catalog.topics[0]?.categories.length).toBeGreaterThan(0)
  })
})

describe('getSwitcherProviders', () => {
  it('offers only the live providers while one of them is active', () => {
    // Vitest runs with DEV=true — mock must still be absent: it is
    // no longer a manual choice, only the env-forced active source.
    expect(getSwitcherProviders('quizapi')).toEqual(['quizapi', 'trivia'])
    expect(getSwitcherProviders('trivia')).toEqual(['quizapi', 'trivia'])
  })

  it('keeps mock as an option only while it is the active source', () => {
    // The switcher must always reflect the current value (an absent
    // option would leave every radio unchecked); leaving mock is the
    // only way out — the env flag decides on the next load.
    expect(getSwitcherProviders('mock')).toEqual(['quizapi', 'trivia', 'mock'])
  })
})

describe('DEFAULT_PROVIDER_ID', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('is quizapi without the mock flag', async () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'false')
    vi.resetModules()

    const { DEFAULT_PROVIDER_ID } = await import('./providers')
    expect(DEFAULT_PROVIDER_ID).toBe('quizapi')
  })

  it('is mock when VITE_USE_MOCK_DATA=true', async () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'true')
    vi.resetModules()

    const { DEFAULT_PROVIDER_ID } = await import('./providers')
    expect(DEFAULT_PROVIDER_ID).toBe('mock')
  })
})
