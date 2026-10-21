import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuizSessionStore } from '../../../shared/lib/session-store'
import { startTimerInterval } from './timer-interval'

describe('startTimerInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useQuizSessionStore.setState({ status: 'playing', timeRemaining: 30 })
  })
  afterEach(() => vi.useRealTimers())

  it('ticks once per second while playing', () => {
    const stop = startTimerInterval(() => true)
    vi.advanceTimersByTime(3000)
    expect(useQuizSessionStore.getState().timeRemaining).toBe(27)
    stop()
  })

  it('pauses while the answer is shown', () => {
    const stop = startTimerInterval(() => true)
    useQuizSessionStore.setState({ status: 'answered' })
    vi.advanceTimersByTime(5000)
    expect(useQuizSessionStore.getState().timeRemaining).toBe(30)

    useQuizSessionStore.setState({ status: 'playing' })
    vi.advanceTimersByTime(1000)
    expect(useQuizSessionStore.getState().timeRemaining).toBe(29)
    stop()
  })

  it('does not end the session on the last second while answered', () => {
    useQuizSessionStore.setState({ status: 'answered', timeRemaining: 1 })
    const stop = startTimerInterval(() => true)
    vi.advanceTimersByTime(3000)
    expect(useQuizSessionStore.getState().status).toBe('answered')
    stop()
  })
})
