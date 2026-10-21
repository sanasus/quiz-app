/**
 * Root layout — sticky header with nav + language toggle,
 * main content area, and footer. Wraps every route via <Outlet />.
 */

import { useEffect } from 'react'
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
import { AppBackground } from '../../shared/ui/app-background'
import { Button } from '../../shared/ui/button'
import { NavItem } from '../../shared/ui/nav-item'
import { TextLink } from '../../shared/ui/text-link'
import { trackPageview } from '../../shared/analytics/analytics'
import { documentTitle } from './document-title'

const routes: { path: string; icon: LucideIcon; key: string }[] = [
  { path: '/', icon: Home, key: 'app.nav.home' },
  { path: '/setup', icon: Play, key: 'app.nav.new_quiz' },
  { path: '/stats', icon: BarChart3, key: 'app.nav.stats' },
  { path: '/achievements', icon: Award, key: 'app.nav.achievements' },
  { path: '/settings', icon: Settings, key: 'app.nav.settings' },
]

/**
 * Footer attribution. Both sources are always credited, whichever
 * provider is active (CC BY-NC 4.0 legal review is pending, so we
 * never rely on showing it conditionally). The line is composed of
 * i18n fragments around the required links (brand and license names
 * stay untranslated).
 */
function ProviderFooter() {
  const { t } = useTranslation()

  return (
    <span>
      {t('app.footer_prefix')}
      QuizAPI
      {t('app.footer_and')}
      <TextLink href="https://the-trivia-api.com">The Trivia API</TextLink>
      {t('app.footer_mid')}
      <TextLink href="https://creativecommons.org/licenses/by-nc/4.0/">
        CC BY-NC 4.0
      </TextLink>
      {t('app.footer_suffix')}
    </span>
  )
}

export function RootLayout() {
  const { t, i18n } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Tab title per route and language; re-runs when the language changes
  // because `t` is a new function then.
  useEffect(() => {
    document.title = documentTitle(pathname, t)
  }, [pathname, t])

  useEffect(() => {
    trackPageview(pathname)
  }, [pathname])

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru'
    i18n.changeLanguage(next).catch(() => {})
  }

  const currentCode = i18n.language === 'ru' ? 'RU' : 'EN'

  return (
    <div className="flex min-h-screen flex-col">
      <AppBackground />

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
            className="text-heading text-primary hover:text-primary-hover"
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
                <NavItem
                  key={r.path}
                  to={r.path}
                  icon={r.icon}
                  label={t(r.key)}
                  active={pathname === r.path}
                />
              ))}
            </nav>

            {/* Language toggle — visible on all screens */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLang}
              data-testid="lang-toggle"
              className="px-4 py-1.5 text-caption"
              aria-label={t('app.language_current', { code: currentCode })}
            >
              {currentCode}
            </Button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav
          className="flex sm:hidden border-t border-border"
          data-testid="mobile-bottom-nav"
        >
          {routes.map((r) => (
            <NavItem
              key={r.path}
              variant="tab"
              to={r.path}
              icon={r.icon}
              label={t(r.key)}
              active={pathname === r.path}
            />
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-4 py-3 text-center text-caption text-text-3">
        <ProviderFooter />
      </footer>
    </div>
  )
}
