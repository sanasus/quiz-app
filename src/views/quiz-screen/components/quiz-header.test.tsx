import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../app/i18n'
import { QuizHeader, type QuizHeaderProps } from './quiz-header'

function renderHeader(props: Partial<QuizHeaderProps> = {}) {
  render(
    <I18nextProvider i18n={i18n}>
      <QuizHeader
        progress={2}
        total={5}
        mode="classic"
        score={120}
        streak={3}
        {...props}
      />
    </I18nextProvider>,
  )
}

describe('QuizHeader', () => {
  it('shows progress, score and streak', () => {
    renderHeader()

    expect(
      screen.getByRole('heading', { name: 'Question 2/5' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('quiz-streak')).toHaveTextContent('Streak')
  })

  it('has no timer or lives in classic mode', () => {
    renderHeader()

    expect(screen.queryByTestId('quiz-timer')).toBeNull()
    expect(screen.queryByTestId('quiz-lives')).toBeNull()
  })

  it('shows the countdown and the draining bar in blitz', () => {
    renderHeader({ mode: 'blitz', timeRemaining: 7, timeLimit: 10 })

    expect(screen.getByRole('timer')).toHaveTextContent('7s')
    expect(screen.getByTestId('quiz-timer-bar')).toHaveStyle({
      animationPlayState: 'running',
    })
  })

  it('stands the bar still while the answer is shown', () => {
    renderHeader({
      mode: 'blitz',
      timeRemaining: 7,
      timeLimit: 10,
      paused: true,
    })

    expect(screen.getByTestId('quiz-timer-bar')).toHaveStyle({
      animationPlayState: 'paused',
    })
  })

  it('warns in red when the time is nearly out', () => {
    renderHeader({ mode: 'blitz', timeRemaining: 2, timeLimit: 10 })

    expect(screen.getByRole('timer')).toHaveClass('text-danger-ink')
  })

  it('keeps a comfortable countdown neutral', () => {
    renderHeader({ mode: 'blitz', timeRemaining: 8, timeLimit: 10 })

    expect(screen.getByRole('timer')).not.toHaveClass('text-danger-ink')
  })

  it('draws one heart per life in survival', () => {
    renderHeader({ mode: 'survival', lives: 2 })

    expect(screen.getByTestId('quiz-lives').textContent).toBe('❤️❤️')
  })
})
