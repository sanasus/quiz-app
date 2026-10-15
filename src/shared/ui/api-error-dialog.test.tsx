/**
 * ApiErrorDialog (T6): renders against the real i18n instance, blocks
 * both actions while retrying, and has no close mechanism — Escape
 * and overlay clicks are inert.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../app/i18n'
import { ApiErrorDialog } from './api-error-dialog'
import type { ApiErrorDialogProps } from './api-error-dialog'

beforeAll(async () => {
  await i18n.changeLanguage('en')
  // Provider labels land in T9 — stub the one this dialog needs so
  // the {{provider}} interpolation assertion is meaningful.
  i18n.addResource('en', 'translation', 'provider.trivia', 'The Trivia API')
})

function renderDialog(overrides: Partial<ApiErrorDialogProps> = {}) {
  const props: ApiErrorDialogProps = {
    open: true,
    providerLabelKey: 'provider.trivia',
    retrying: false,
    onRetry: vi.fn(),
    onChangeApi: vi.fn(),
    ...overrides,
  }
  render(
    <I18nextProvider i18n={i18n}>
      <ApiErrorDialog {...props} />
    </I18nextProvider>,
  )
  return props
}

describe('ApiErrorDialog', () => {
  it('renders title, provider message and both actions', () => {
    renderDialog()

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Question source unavailable')).toBeInTheDocument()
    expect(
      screen.getByText(/The Trivia API did not respond/),
    ).toBeInTheDocument()
    expect(screen.getByTestId('api-error-retry')).toBeInTheDocument()
    expect(screen.getByTestId('api-error-change')).toBeInTheDocument()
  })

  it('disables both actions while retrying', () => {
    const props = renderDialog({ retrying: true })

    const retry = screen.getByTestId('api-error-retry')
    const change = screen.getByTestId('api-error-change')
    expect(retry).toBeDisabled()
    expect(change).toBeDisabled()

    fireEvent.click(retry)
    fireEvent.click(change)
    expect(props.onRetry).not.toHaveBeenCalled()
    expect(props.onChangeApi).not.toHaveBeenCalled()
  })

  it('wires Retry to onRetry and Change API to onChangeApi', () => {
    const props = renderDialog()

    fireEvent.click(screen.getByTestId('api-error-retry'))
    expect(props.onRetry).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('api-error-change'))
    expect(props.onChangeApi).toHaveBeenCalledTimes(1)

    // No click-event argument may leak into the handlers: a caller
    // like changeProvider(next?) would swallow it as a provider id.
    expect(vi.mocked(props.onRetry).mock.calls[0]).toHaveLength(0)
    expect(vi.mocked(props.onChangeApi).mock.calls[0]).toHaveLength(0)
  })

  it('ignores Escape and overlay clicks — no close mechanism', () => {
    const props = renderDialog()

    fireEvent.click(screen.getByRole('presentation'))
    fireEvent.keyDown(screen.getByRole('presentation'), { key: 'Escape' })

    expect(props.onRetry).not.toHaveBeenCalled()
    expect(props.onChangeApi).not.toHaveBeenCalled()
    // Still open — only an explicit action leaves the dialog.
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('moves focus to Retry when opened', () => {
    renderDialog()

    expect(screen.getByTestId('api-error-retry')).toHaveFocus()
  })

  it('renders the raw error message when provided', () => {
    renderDialog({ errorMessage: 'The Trivia API error: HTTP 500' })

    expect(
      screen.getByText('The Trivia API error: HTTP 500'),
    ).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    renderDialog({ open: false })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
