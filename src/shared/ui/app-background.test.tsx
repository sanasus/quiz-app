import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIG, useQuizSessionStore } from '../lib/session-store'
import type { Question } from '../types/quiz'
import { AppBackground } from './app-background'

const question: Question = {
  id: 'q1',
  text: 'Q?',
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ],
  correctOptionIds: ['a'],
  category: 'science',
  difficulty: 'easy',
}

function hue() {
  return screen
    .getByTestId('app-background')
    .style.getPropertyValue('--aura-hue')
}

function answer(optionId: string) {
  act(() => {
    useQuizSessionStore.getState().selectOption(optionId)
    useQuizSessionStore.getState().submitAnswer(10)
  })
}

describe('AppBackground', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useQuizSessionStore.getState().reset()
    useQuizSessionStore.getState().loadQuestions([question], {
      ...DEFAULT_CONFIG,
      category: 'science',
    })
    useQuizSessionStore.getState().startPlaying()
  })

  afterEach(() => {
    vi.useRealTimers()
    useQuizSessionStore.getState().reset()
  })

  it('uses a category hue instead of the brand hue during a quiz', () => {
    render(<AppBackground />)
    expect(hue()).not.toBe('285')
  })

  it('flashes green on a correct answer, then returns', () => {
    render(<AppBackground />)
    const before = hue()
    answer('a')
    expect(screen.getByTestId('app-background')).toHaveAttribute(
      'data-flash',
      'correct',
    )
    expect(hue()).toBe('160')
    act(() => {
      vi.advanceTimersByTime(1300)
    })
    expect(screen.getByTestId('app-background')).not.toHaveAttribute(
      'data-flash',
    )
    expect(hue()).toBe(before)
  })

  it('flashes red on a wrong answer', () => {
    render(<AppBackground />)
    answer('b')
    expect(screen.getByTestId('app-background')).toHaveAttribute(
      'data-flash',
      'wrong',
    )
    expect(hue()).toBe('25')
  })
})
