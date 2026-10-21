import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { NextCountdown } from './next-countdown'

describe('NextCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('moves on by itself when the delay runs out', () => {
    const onNext = vi.fn()
    render(<NextCountdown delayMs={1500} onNext={onNext} />)
    act(() => {
      vi.advanceTimersByTime(1499)
    })
    expect(onNext).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows the seconds left', () => {
    render(<NextCountdown delayMs={3500} onNext={vi.fn()} />)
    expect(screen.getByTestId('next-countdown')).toHaveTextContent('4')
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(screen.getByTestId('next-countdown')).toHaveTextContent('3')
  })

  it('skips the wait when pressed', () => {
    const onNext = vi.fn()
    render(<NextCountdown delayMs={3500} onNext={onNext} />)
    fireEvent.click(screen.getByTestId('next-countdown'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('holds while blocked', () => {
    const onNext = vi.fn()
    render(<NextCountdown delayMs={1500} blocked onNext={onNext} />)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(onNext).not.toHaveBeenCalled()
    expect(screen.getByTestId('next-countdown')).toBeDisabled()
  })

  it('starts the digit from the full delay when it unblocks', () => {
    const { rerender } = render(
      <NextCountdown delayMs={3500} onNext={vi.fn()} />,
    )
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(screen.getByTestId('next-countdown')).toHaveTextContent('1')

    rerender(<NextCountdown delayMs={3500} blocked onNext={vi.fn()} />)
    rerender(<NextCountdown delayMs={3500} onNext={vi.fn()} />)

    // Not the stale «1» from before the wait.
    expect(screen.getByTestId('next-countdown')).toHaveTextContent('4')
  })
})
