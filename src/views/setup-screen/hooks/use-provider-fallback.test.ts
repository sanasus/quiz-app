/**
 * useProviderFallback (T7): auto-switch policy on the setup screen —
 * a broken provider (auth/rate_limit/parse/http/timeout) switches
 * once with a toast; network alone never switches; a second failure
 * after the switch falls back to the inline error.
 *
 * useChangeProvider is mocked — the real one needs a router.
 */

import { createElement } from 'react'
import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../app/i18n'
import { QuizApiError } from '../../../shared/api/errors'
import type { ErrorKind } from '../../../shared/api/errors'
import { useProviderStore } from '../../../shared/api/provider-store'
import { useProviderFallback } from './use-provider-fallback'
import type { ProviderFallbackInput } from './use-provider-fallback'

const changeProviderMock = vi.fn()

vi.mock('../../../features/provider/use-change-provider', () => ({
  useChangeProvider: () => changeProviderMock,
}))

function apiError(kind: ErrorKind, message = 'boom'): QuizApiError {
  return new QuizApiError(message, { kind, providerId: 'quizapi' })
}

const noInput: ProviderFallbackInput = {
  metadataError: null,
  categoriesError: null,
  refetchMetadata: vi.fn(),
  refetchCategories: vi.fn(),
}

function renderFallback(initialProps: ProviderFallbackInput) {
  return renderHook(
    (props: ProviderFallbackInput) => useProviderFallback(props),
    {
      initialProps,
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(I18nextProvider, { i18n }, children),
    },
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('useProviderFallback', () => {
  beforeEach(() => {
    changeProviderMock.mockClear()
    useProviderStore.setState({ providerId: 'quizapi' })
  })

  it('does nothing without errors', () => {
    const { result } = renderFallback(noInput)

    expect(changeProviderMock).not.toHaveBeenCalled()
    expect(result.current.toast).toBeNull()
    expect(result.current.inlineError).toBeNull()
  })

  it('auto-switches once on a broken-provider error, with a toast', () => {
    const { result } = renderFallback({
      ...noInput,
      metadataError: apiError('auth', 'Invalid API key'),
    })

    expect(changeProviderMock).toHaveBeenCalledTimes(1)
    expect(changeProviderMock).toHaveBeenCalledWith('trivia')
    expect(result.current.toast?.title).toBe('Question source changed')
    expect(result.current.toast?.message).toContain('The Trivia API')
    expect(result.current.inlineError).toBeNull()
  })

  it('never switches on a network error — inline error instead', () => {
    const { result } = renderFallback({
      ...noInput,
      categoriesError: apiError('network', 'Failed to fetch'),
    })

    expect(changeProviderMock).not.toHaveBeenCalled()
    expect(result.current.toast).toBeNull()
    expect(result.current.inlineError).toBe('Failed to fetch')
  })

  it('auto-switches on a timeout — a hung provider is broken', () => {
    // HAR-verified: quizapi.io hung until AbortSignal.timeout fired,
    // so a timeout is the provider's fault, not the connection's.
    const { result } = renderFallback({
      ...noInput,
      metadataError: apiError('timeout', 'The operation timed out'),
    })

    expect(changeProviderMock).toHaveBeenCalledTimes(1)
    expect(changeProviderMock).toHaveBeenCalledWith('trivia')
    expect(result.current.toast?.title).toBe('Question source changed')
    expect(result.current.inlineError).toBeNull()
  })

  it('a broken error wins over a simultaneous network one', () => {
    const { result } = renderFallback({
      ...noInput,
      metadataError: apiError('network', 'Failed to fetch'),
      categoriesError: apiError('auth', 'Invalid API key'),
    })

    expect(changeProviderMock).toHaveBeenCalledTimes(1)
    expect(changeProviderMock).toHaveBeenCalledWith('trivia')
    expect(result.current.inlineError).toBeNull()
  })

  it('does not switch twice — the second failure shows the inline error', () => {
    const { result, rerender } = renderFallback({
      ...noInput,
      metadataError: apiError('auth', 'Invalid API key'),
    })
    expect(changeProviderMock).toHaveBeenCalledTimes(1)

    // The fallback provider fails too — queries refetched under the
    // new providerId key and errored again.
    rerender({
      ...noInput,
      metadataError: apiError('http', 'HTTP 500 from the fallback'),
    })

    expect(changeProviderMock).toHaveBeenCalledTimes(1)
    expect(result.current.inlineError).toBe('HTTP 500 from the fallback')
  })

  it('dismissToast clears the toast', () => {
    const { result } = renderFallback({
      ...noInput,
      metadataError: apiError('auth'),
    })
    expect(result.current.toast).not.toBeNull()

    act(() => result.current.dismissToast())

    expect(result.current.toast).toBeNull()
  })

  it('retryAll refetches both setup queries', () => {
    const input: ProviderFallbackInput = {
      ...noInput,
      refetchMetadata: vi.fn(),
      refetchCategories: vi.fn(),
    }
    const { result } = renderFallback(input)

    act(() => result.current.retryAll())

    expect(input.refetchMetadata).toHaveBeenCalledTimes(1)
    expect(input.refetchCategories).toHaveBeenCalledTimes(1)
  })
})
