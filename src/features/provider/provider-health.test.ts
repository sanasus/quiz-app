import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { QuizApiError, type ErrorKind } from '../../shared/api/errors'
import {
  FAILURE_TTL_MS,
  failedProviders,
  isDegraded,
  otherProviderFailed,
  useProviderHealth,
  useReportProviderHealth,
} from './provider-health'

const NOW = 1_000_000

beforeEach(() => {
  useProviderHealth.getState().reset()
})

describe('degraded state', () => {
  it('needs both live providers to have failed', () => {
    expect(isDegraded({}, NOW)).toBe(false)
    expect(isDegraded({ quizapi: { kind: 'auth', at: NOW } }, NOW)).toBe(false)
    expect(
      isDegraded(
        {
          quizapi: { kind: 'auth', at: NOW },
          trivia: { kind: 'http', at: NOW },
        },
        NOW,
      ),
    ).toBe(true)
  })

  it('a failure expires after the TTL', () => {
    const failures = {
      quizapi: { kind: 'auth' as const, at: NOW - FAILURE_TTL_MS },
      trivia: { kind: 'http' as const, at: NOW },
    }

    expect(failedProviders(failures, NOW)).toEqual(['trivia'])
    expect(isDegraded(failures, NOW)).toBe(false)
  })

  it('otherProviderFailed ignores the current provider and the mock', () => {
    const failures = { quizapi: { kind: 'auth' as const, at: NOW } }

    expect(otherProviderFailed(failures, 'quizapi', NOW)).toBe(false)
    expect(otherProviderFailed(failures, 'trivia', NOW)).toBe(true)
    expect(otherProviderFailed(failures, 'mock', NOW)).toBe(true)
  })
})

describe('useReportProviderHealth', () => {
  const failure = (kind: ErrorKind) =>
    new QuizApiError('x', { kind, providerId: 'trivia' })
  const failuresNow = () => useProviderHealth.getState().failures

  it('marks a provider fault and clears it on success', () => {
    const { rerender } = renderHook(
      (query: { isSuccess: boolean; error: Error | null }) =>
        useReportProviderHealth('trivia', query),
      {
        initialProps: {
          isSuccess: false,
          error: failure('rate_limit'),
        } as { isSuccess: boolean; error: Error | null },
      },
    )
    expect(failuresNow().trivia?.kind).toBe('rate_limit')

    rerender({ isSuccess: true, error: null })
    expect(failuresNow().trivia).toBeUndefined()
  })

  it('does not count a network failure — that is the connection, not the provider', () => {
    renderHook(() =>
      useReportProviderHealth('trivia', {
        isSuccess: false,
        error: failure('network'),
      }),
    )

    expect(failuresNow().trivia).toBeUndefined()
  })

  it('never tracks the mock', () => {
    renderHook(() =>
      useReportProviderHealth('mock', {
        isSuccess: false,
        error: failure('http'),
      }),
    )

    expect(failuresNow()).toEqual({})
  })
})
