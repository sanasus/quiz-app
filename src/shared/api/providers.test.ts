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

  it('marks only quizapi as requiring an API key', () => {
    expect(getProvider('quizapi').requiresApiKey).toBe(true)
    expect(getProvider('trivia').requiresApiKey).toBe(false)
    expect(getProvider('mock').requiresApiKey).toBe(false)
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
