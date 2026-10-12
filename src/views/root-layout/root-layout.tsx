/**
 * Root layout — sticky header with nav + language toggle,
 * main content area, and footer. Wraps every route via <Outlet />.
 */

import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

const routes = [
  { path: '/', label: '🏠', key: 'app.nav.home' },
  { path: '/setup', label: '⚙️', key: 'app.nav.setup' },
  { path: '/quiz', label: '🎮', key: 'app.nav.quiz' },
  { path: '/results', label: '🏆', key: 'app.nav.results' },
  { path: '/stats', label: '📊', key: 'app.nav.stats' },
  { path: '/achievements', label: '🏅', key: 'app.nav.achievements' },
  { path: '/settings', label: '⚙️', key: 'app.nav.settings' },
]

export function RootLayout() {
  const { t, i18n } = useTranslation()

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru'
    i18n.changeLanguage(next).catch(() => {})
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">{t('app.title')}</h1>

          <div className="flex items-center gap-4">
            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 sm:flex">
              {routes.map((r) => (
                <a
                  key={r.path}
                  href={r.path}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-text-2 transition-colors hover:bg-muted hover:text-text"
                >
                  {r.label} {t(r.key)}
                </a>
              ))}
            </nav>

            {/* Language toggle — visible on all screens */}
            <button
              type="button"
              onClick={toggleLang}
              data-testid="lang-toggle"
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-muted"
              aria-label="Toggle language"
            >
              {i18n.language === 'ru' ? 'RU' : 'EN'}
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav
          className="flex sm:hidden border-t border-border"
          data-testid="mobile-bottom-nav"
        >
          {routes.map((r) => (
            <a
              key={r.path}
              href={r.path}
              className="flex flex-1 flex-col items-center justify-center py-2 text-xs text-text-3 transition-colors hover:text-text"
            >
              <span className="text-base">{r.label}</span>
            </a>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-4 py-3 text-center text-xs text-text-3">
        QuizApp · Powered by QuizAPI
      </footer>
    </div>
  )
}
