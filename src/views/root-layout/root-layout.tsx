/**
 * Root layout — sticky header with nav + language toggle,
 * main content area, and footer. Wraps every route via <Outlet />.
 */

import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Award,
  BarChart3,
  Home,
  Play,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { useProviderStore } from '../../shared/api/provider-store'

const routes: { path: string; icon: LucideIcon; key: string }[] = [
  { path: '/', icon: Home, key: 'app.nav.home' },
  { path: '/setup', icon: Play, key: 'app.nav.new_quiz' },
  { path: '/stats', icon: BarChart3, key: 'app.nav.stats' },
  { path: '/achievements', icon: Award, key: 'app.nav.achievements' },
  { path: '/settings', icon: Settings, key: 'app.nav.settings' },
]

// Attribution links for The Trivia API: its license (CC BY-NC 4.0)
// requires attribution with a link. Subtle in the footer's own colors.
const triviaLinkClass =
  'underline decoration-text-3/40 underline-offset-2 transition-colors hover:text-text'

/**
 * Footer attribution per active provider. The trivia line is composed
 * of i18n fragments around the two required links (brand and license
 * names stay untranslated).
 */
function ProviderFooter() {
  const { t } = useTranslation()
  const providerId = useProviderStore((s) => s.providerId)

  if (providerId === 'trivia') {
    return (
      <span>
        {t('app.footer_trivia_prefix')}
        <a
          href="https://the-trivia-api.com"
          target="_blank"
          rel="noopener noreferrer"
          className={triviaLinkClass}
        >
          The Trivia API
        </a>
        {t('app.footer_trivia_mid')}
        <a
          href="https://creativecommons.org/licenses/by-nc/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className={triviaLinkClass}
        >
          CC BY-NC 4.0
        </a>
        {t('app.footer_trivia_suffix')}
      </span>
    )
  }

  if (providerId === 'quizapi') {
    return <span>{t('app.footer_quizapi')}</span>
  }

  return <span>{t('app.footer_mock')}</span>
}

export function RootLayout() {
  const { t, i18n } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru'
    i18n.changeLanguage(next).catch(() => {})
  }

  const currentCode = i18n.language === 'ru' ? 'RU' : 'EN'

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Skip link — first focusable element on the page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-on-primary"
      >
        {t('app.skip_to_content')}
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Brand is a link, not a heading: each page owns the only h1. */}
          <Link
            to="/"
            className="text-xl font-bold text-primary hover:text-primary-hover"
          >
            {t('app.title')}
          </Link>

          <div className="flex items-center gap-4">
            {/* Desktop nav */}
            <nav
              data-testid="desktop-nav"
              className="hidden items-center gap-1 sm:flex"
            >
              {routes.map((r) => (
                <Link
                  key={r.path}
                  to={r.path}
                  aria-current={pathname === r.path ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-text ${
                    pathname === r.path ? 'bg-muted text-text' : 'text-text-2'
                  }`}
                >
                  <r.icon className="h-4 w-4" aria-hidden="true" />
                  {t(r.key)}
                </Link>
              ))}
            </nav>

            {/* Language toggle — visible on all screens */}
            <button
              type="button"
              onClick={toggleLang}
              data-testid="lang-toggle"
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-muted"
              aria-label={t('app.language_current', { code: currentCode })}
            >
              {currentCode}
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav
          className="flex sm:hidden border-t border-border"
          data-testid="mobile-bottom-nav"
        >
          {routes.map((r) => (
            <Link
              key={r.path}
              to={r.path}
              aria-label={t(r.key)}
              aria-current={pathname === r.path ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors hover:text-text ${
                pathname === r.path ? 'text-text' : 'text-text-3'
              }`}
            >
              <r.icon className="h-5 w-5" aria-hidden="true" />
              <span aria-hidden="true">{t(r.key)}</span>
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-4 py-3 text-center text-xs text-text-3">
        <ProviderFooter />
      </footer>
    </div>
  )
}
