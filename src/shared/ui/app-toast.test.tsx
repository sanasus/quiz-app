/**
 * AppToast (T7): transient notification — message (+ optional title),
 * polite live region, auto-dismiss on a timer, manual dismiss.
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import i18n from '../../app/i18n'
import { AppToast } from './app-toast'

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

function renderToast(message: string, title?: string) {
  const onDismiss = vi.fn()
  render(
    <I18nextProvider i18n={i18n}>
      <AppToast message={message} title={title} onDismiss={onDismiss} />
    </I18nextProvider>,
  )
  return { onDismiss }
}

describe('AppToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the message and the optional title in a polite live region', () => {
    renderToast('Now using The Trivia API.', 'Question source changed')

    expect(screen.getByText('Question source changed')).toBeInTheDocument()
    expect(screen.getByText('Now using The Trivia API.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('auto-dismisses after the default 5 seconds', () => {
    const { onDismiss } = renderToast('Hello')

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not auto-dismiss early', () => {
    const { onDismiss } = renderToast('Hello')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('dismisses manually via the close button', () => {
    const { onDismiss } = renderToast('Hello')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
