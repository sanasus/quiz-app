/**
 * Root layout — sticky header with nav + language toggle,
 * main content area, and footer. Wraps every route via <Outlet />.
 */

import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

const routes = [
  { path: '/', label: '🏠', key: 'app.nav.home' },
  { path: '/setup', label: '🎯', key: 'app.nav.new_quiz' },
  { path: '/stats', label: '📊', key: 'app.nav.stats' },
  { path: '/achievements', label: '🏅', key: 'app.nav.achievements' },
  { path: '/settings', label: '⚙️', key: 'app.nav.settings' },
]

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
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-text ${
                    pathname === r.path ? 'bg-muted text-text' : 'text-text-2'
                  }`}
                >
                  {r.label} {t(r.key)}
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
              className={`flex flex-1 flex-col items-center justify-center py-2 text-xs transition-colors hover:text-text ${
                pathname === r.path ? 'text-text' : 'text-text-3'
              }`}
            >
              <span className="text-base" aria-hidden="true">
                {r.label}
              </span>
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
        {t('app.footer')}
      </footer>
    </div>
  )
}
