/**
 * Application-level error boundary UI.
 *
 * Wired as `defaultErrorComponent` in app/router.ts, so any render or
 * loader error inside a route is caught here instead of blanking the app.
 * `reset()` re-renders the failed route without a full page reload.
 */

import { useNavigate } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center"
      role="alert"
    >
      <h1 className="text-7xl font-bold text-danger-ink">💥</h1>
      <p className="text-xl text-text-2">{t('common.error_title')}</p>
      {error instanceof Error && (
        <p className="max-w-md break-words text-sm text-text-2/70">
          {error.message}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-lg bg-primary px-6 py-2 font-semibold text-on-primary transition-colors hover:bg-primary/90"
        >
          {t('common.retry')}
        </button>
        <button
          onClick={() => navigate({ to: '/' })}
          className="rounded-lg bg-bg-2 px-6 py-2 font-semibold text-text transition-colors hover:bg-bg-3"
        >
          {t('common.back')}
        </button>
      </div>
    </div>
  )
}
