import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useQuizKeyboard } from './use-quiz-keyboard'
import type { SessionStatus } from '../../../shared/types/quiz'

interface Setup {
  onSelectIndex: ReturnType<typeof vi.fn>
  onNext: ReturnType<typeof vi.fn>
}

function setup(overrides: {
  status?: SessionStatus
  optionCount?: number
}): Setup {
  const spies = {
    onSelectIndex: vi.fn<(index: number) => void>(),
    onNext: vi.fn<() => void>(),
  }
  renderHook(() =>
    useQuizKeyboard({
      optionCount: overrides.optionCount ?? 4,
      status: overrides.status ?? 'playing',
      ...spies,
    }),
  )
  return spies
}

function press(key: string, target: EventTarget = window) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
}

describe('useQuizKeyboard', () => {
  it('maps digits 1–4 to option indexes while playing', () => {
    const h = setup({ status: 'playing' })
    press('1')
    press('3')
    expect(h.onSelectIndex).toHaveBeenNthCalledWith(1, 0)
    expect(h.onSelectIndex).toHaveBeenNthCalledWith(2, 2)
  })

  it('ignores digits beyond the option count', () => {
    const h = setup({ optionCount: 4 })
    press('6')
    expect(h.onSelectIndex).not.toHaveBeenCalled()
  })

  it('ignores digits once the question is answered', () => {
    const h = setup({ status: 'answered' })
    press('1')
    expect(h.onSelectIndex).not.toHaveBeenCalled()
  })

  it('advances on Enter when already answered', () => {
    const h = setup({ status: 'answered' })
    press('Enter')
    expect(h.onNext).toHaveBeenCalledTimes(1)
  })

  it('does nothing on Enter while playing', () => {
    const h = setup({ status: 'playing' })
    press('Enter')
    expect(h.onNext).not.toHaveBeenCalled()
  })

  it('ignores keys while focus is on a button', () => {
    const h = setup({ status: 'answered' })
    const button = document.createElement('button')
    document.body.appendChild(button)
    press('Enter', button)
    expect(h.onNext).not.toHaveBeenCalled()
    button.remove()
  })
})
