/**
 * RootLayout footer (T9): the attribution follows the active provider
 * — the trivia line carries the CC BY-NC 4.0 links its license
 * requires; other providers get a plain line.
 *
 * The router is mocked (Link/Outlet/useRouterState) — the layout
 * needs no real routing context for the footer.
 */

import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../app/i18n'
import { useProviderStore } from '../../shared/api/provider-store'
import { RootLayout } from './root-layout'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Outlet: () => null,
  useRouterState: () => ({ location: { pathname: '/' } }),
}))

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

function renderLayout() {
  render(
    <I18nextProvider i18n={i18n}>
      <RootLayout />
    </I18nextProvider>,
  )
  return screen.getByRole('contentinfo')
}

describe('RootLayout footer', () => {
  beforeEach(() => {
    useProviderStore.setState({ providerId: 'quizapi' })
  })

  it('links The Trivia API and its license when trivia is active', () => {
    useProviderStore.setState({ providerId: 'trivia' })
    const footer = renderLayout()

    expect(footer).toHaveTextContent(
      'QuizApp · Powered by The Trivia API (CC BY-NC 4.0)',
    )

    const triviaLink = screen.getByRole('link', { name: 'The Trivia API' })
    expect(triviaLink).toHaveAttribute('href', 'https://the-trivia-api.com')
    expect(triviaLink).toHaveAttribute('target', '_blank')
    expect(triviaLink).toHaveAttribute('rel', 'noopener noreferrer')

    const licenseLink = screen.getByRole('link', { name: 'CC BY-NC 4.0' })
    expect(licenseLink).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-nc/4.0/',
    )
    expect(licenseLink).toHaveAttribute('target', '_blank')
  })

  it('shows a plain QuizAPI line without links', () => {
    const footer = renderLayout()

    expect(footer).toHaveTextContent('QuizApp · Powered by QuizAPI')
    expect(within(footer).queryByRole('link')).not.toBeInTheDocument()
  })

  it('marks the mock line as a development one', () => {
    useProviderStore.setState({ providerId: 'mock' })
    const footer = renderLayout()

    expect(footer).toHaveTextContent('QuizApp · Mock data (development)')
    expect(within(footer).queryByRole('link')).not.toBeInTheDocument()
  })
})
