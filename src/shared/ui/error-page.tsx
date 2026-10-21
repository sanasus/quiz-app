/**
 * Application-level error boundary UI.
 *
 * Wired as `defaultErrorComponent` in app/router.ts, so any render or
 * loader error inside a route is caught here instead of blanking the app.
 * `reset()` re-renders the failed route without a full page reload.
 */

import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { captureException } from '../analytics/analytics'
import { Button } from './button'

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // The boundary swallows the error, so report it from here.
  useEffect(() => {
    captureException(error, { source: 'error-boundary' })
  }, [error])

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center"
      role="alert"
    >
      <h1 className="text-danger-ink">
        <TriangleAlert className="h-20 w-20" aria-hidden="true" />
      </h1>
      <p className="text-xl text-text-2">{t('common.error_title')}</p>
      {error instanceof Error && (
        <p className="max-w-md break-words text-body text-text-2/70">
          {error.message}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={() => reset()}>{t('common.retry')}</Button>
        <Button variant="ghost" onClick={() => navigate({ to: '/' })}>
          {t('common.back')}
        </Button>
      </div>
    </div>
  )
}
