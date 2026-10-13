import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useQuizKeyboard } from './use-quiz-keyboard'
import type { SessionStatus } from '../../../shared/types/quiz'

interface Handlers {
  onToggleIndex: (index: number) => void
  onSubmit: () => void
  onNext: () => void
  onClear: () => void
}

interface Setup {
  onToggleIndex: ReturnType<typeof vi.fn>
  onSubmit: ReturnType<typeof vi.fn>
  onNext: ReturnType<typeof vi.fn>
  onClear: ReturnType<typeof vi.fn>
}

function setup(overrides: {
  status?: SessionStatus
  optionCount?: number
  hasSelection?: boolean
}): Setup {
  const spies = {
    onToggleIndex: vi.fn<(index: number) => void>(),
    onSubmit: vi.fn<() => void>(),
    onNext: vi.fn<() => void>(),
    onClear: vi.fn<() => void>(),
  }
  const handlers: Handlers = spies
  renderHook(() =>
    useQuizKeyboard({
      optionCount: overrides.optionCount ?? 4,
      status: overrides.status ?? 'playing',
      hasSelection: overrides.hasSelection ?? false,
      ...handlers,
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
    expect(h.onToggleIndex).toHaveBeenNthCalledWith(1, 0)
    expect(h.onToggleIndex).toHaveBeenNthCalledWith(2, 2)
  })

  it('ignores digits beyond the option count', () => {
    const h = setup({ optionCount: 4 })
    press('6')
    expect(h.onToggleIndex).not.toHaveBeenCalled()
  })

  it('submits on Enter only when something is selected', () => {
    const none = setup({ status: 'playing', hasSelection: false })
    press('Enter')
    expect(none.onSubmit).not.toHaveBeenCalled()

    const some = setup({ status: 'playing', hasSelection: true })
    press('Enter')
    expect(some.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('advances on Enter when already answered', () => {
    const h = setup({ status: 'answered', hasSelection: false })
    press('Enter')
    expect(h.onNext).toHaveBeenCalledTimes(1)
    expect(h.onSubmit).not.toHaveBeenCalled()
  })

  it('clears the selection on Esc', () => {
    const h = setup({ status: 'playing', hasSelection: true })
    press('Escape')
    expect(h.onClear).toHaveBeenCalledTimes(1)
  })

  it('ignores keys while focus is on a button', () => {
    const h = setup({ status: 'playing', hasSelection: true })
    const button = document.createElement('button')
    document.body.appendChild(button)
    press('Enter', button)
    expect(h.onSubmit).not.toHaveBeenCalled()
    button.remove()
  })
})
