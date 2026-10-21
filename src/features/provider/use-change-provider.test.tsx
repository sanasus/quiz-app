/**
 * useChangeProvider (T5): switching the provider must update the
 * provider store, wipe the ['quiz'] query cache and the quiz session,
 * and navigate to /setup.
 *
 * The hook uses the module-level queryClient (app/query-client) and
 * getState() on the stores, so no React providers are needed — only
 * the router is mocked.
 */

import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../../app/query-client'
import { useProviderStore } from '../../shared/api/provider-store'
import {
  DEFAULT_CONFIG,
  useQuizSessionStore,
} from '../../shared/lib/session-store'
import type { Question } from '../../shared/types/quiz'
import { useChangeProvider } from './use-change-provider'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const question: Question = {
  id: 'q1',
  text: 'What is 2+2?',
  options: [
    { id: 'a', text: '4' },
    { id: 'b', text: '5' },
  ],
  correctOptionIds: ['a'],
  difficulty: 'easy',
}

describe('useChangeProvider', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    localStorage.clear()
    // Stores are module singletons — pin their state per test. RESET
    // keeps the config by design, so restore it explicitly too.
    useProviderStore.setState({ providerId: 'quizapi' })
    useQuizSessionStore.getState().reset()
    useQuizSessionStore.getState().updateConfig(DEFAULT_CONFIG)
    queryClient.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('toggles provider, clears cache and session, navigates', () => {
    queryClient.setQueryData(['quiz', 'quizapi', 'questions', null], {
      questions: [question],
      total: 1,
    })
    useQuizSessionStore.setState({
      status: 'playing',
      questions: [question],
      sessionStartTime: 12345,
      timeRemaining: 20,
    })

    const { result } = renderHook(() => useChangeProvider())
    act(() => result.current())

    expect(useProviderStore.getState().providerId).toBe('trivia')
    // The whole ['quiz'] cache is gone, both providers' entries.
    expect(
      queryClient.getQueryData(['quiz', 'quizapi', 'questions', null]),
    ).toBeUndefined()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)

    const session = useQuizSessionStore.getState()
    expect(session.status).toBe('idle')
    expect(session.questions).toEqual([])
    expect(session.sessionStartTime).toBeNull()
    expect(session.timeRemaining).toBeUndefined()

    expect(navigateMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/setup' })
  })

  it('uses the explicit provider argument over the toggle', () => {
    // Current is already 'trivia': the toggle would flip to 'quizapi',
    // so passing 'trivia' proves the argument wins.
    useProviderStore.setState({ providerId: 'trivia' })

    const { result } = renderHook(() => useChangeProvider())
    act(() => result.current('trivia'))

    expect(useProviderStore.getState().providerId).toBe('trivia')
    expect(navigateMock).toHaveBeenCalledWith({ to: '/setup' })
  })

  it('switches the store before clearing the cache, then navigates', () => {
    const setProviderIdSpy = vi.spyOn(
      useProviderStore.getState(),
      'setProviderId',
    )
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries')

    const { result } = renderHook(() => useChangeProvider())
    act(() => result.current())

    expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['quiz'] })
    expect(setProviderIdSpy.mock.invocationCallOrder[0]).toBeLessThan(
      removeQueriesSpy.mock.invocationCallOrder[0],
    )
    expect(removeQueriesSpy.mock.invocationCallOrder[0]).toBeLessThan(
      navigateMock.mock.invocationCallOrder[0],
    )
  })

  it('resets only the category on switch, keeping the other settings', () => {
    // Categories are provider-specific slugs (quizapi: programming…
    // vs trivia: science…) — a slug picked under the old provider must
    // not leak into the new one. Difficulty/count/mode match across
    // the live providers, so the user's tuning survives on purpose
    // (retake a quiz with the same settings).
    useQuizSessionStore.getState().updateConfig({
      category: 'programming',
      difficulty: 'hard',
      questionCount: 15,
      mode: 'survival',
    })

    const { result } = renderHook(() => useChangeProvider())
    act(() => result.current())

    const { config } = useQuizSessionStore.getState()
    expect(config.category).toBe(DEFAULT_CONFIG.category)
    expect(config.difficulty).toBe('hard')
    expect(config.questionCount).toBe(15)
    expect(config.mode).toBe('survival')
  })
})
