/**
 * RootLayout footer (T9): both credits (QuizAPI, The Trivia API with
 * its CC BY-NC 4.0 links) are shown whichever provider is active.
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
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => string
  }) => select({ location: { pathname: '/' } }),
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
      'QuizApp · Powered by QuizAPI and The Trivia API (CC BY-NC 4.0), questions adapted',
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

  it('shows both credits and links when quizapi is active', () => {
    const footer = renderLayout()

    expect(footer).toHaveTextContent(
      'QuizApp · Powered by QuizAPI and The Trivia API (CC BY-NC 4.0), questions adapted',
    )
    expect(within(footer).getAllByRole('link')).toHaveLength(2)
  })

  it('keeps both credits when mock is active', () => {
    useProviderStore.setState({ providerId: 'mock' })
    const footer = renderLayout()

    expect(footer).toHaveTextContent(
      'QuizApp · Powered by QuizAPI and The Trivia API (CC BY-NC 4.0), questions adapted',
    )
    expect(within(footer).getAllByRole('link')).toHaveLength(2)
  })
})
