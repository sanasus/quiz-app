/**
 * API error dialog — shown when the active question provider fails
 * (initial fetch or a survival batch).
 *
 * Unlike ConfirmDialog it has no close mechanism at all: Escape and
 * overlay clicks are inert, the user must pick an action — retry or
 * switch the provider.
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export interface ApiErrorDialogProps {
  open: boolean
  /** i18n key of the failing provider's display name. */
  providerLabelKey: string
  /** Raw error message for the small muted line; hidden when null. */
  errorMessage?: string | null
  /** A retry is in flight — the dialog stays open with a spinner. */
  retrying: boolean
  /** A provider switch is navigating away — both actions are blocked. */
  switching?: boolean
  onRetry: () => void
  onChangeApi: () => void
}

export function ApiErrorDialog({
  open,
  providerLabelKey,
  errorMessage,
  retrying,
  switching = false,
  onRetry,
  onChangeApi,
}: ApiErrorDialogProps) {
  const { t } = useTranslation()
  const retryRef = useRef<HTMLButtonElement>(null)

  // Move focus to the primary action when the dialog opens.
  useEffect(() => {
    if (open) retryRef.current?.focus()
  }, [open])

  if (!open) return null

  const busy = retrying || switching

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="api-error-title"
        aria-describedby="api-error-message"
        className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl"
      >
        <h2 id="api-error-title" className="mb-2 text-lg font-bold text-text">
          {t('api_error.title')}
        </h2>
        <p
          id="api-error-message"
          className={`text-sm text-text-2 ${errorMessage ? 'mb-2' : 'mb-6'}`}
        >
          {t('api_error.message', { provider: t(providerLabelKey) })}
        </p>
        {errorMessage ? (
          <p className="mb-6 break-words text-xs text-text-2 opacity-75">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            // Wrapped on purpose: passing the raw handler would leak
            // the click event into a `changeProvider(next?)` caller,
            // which would swallow it as a provider id.
            onClick={() => onChangeApi()}
            disabled={busy}
            className="rounded-lg border-2 border-border px-4 py-2 font-semibold text-text transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="api-error-change"
          >
            {t('api_error.change_api')}
          </button>
          <button
            ref={retryRef}
            type="button"
            onClick={() => onRetry()}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="api-error-retry"
          >
            {retrying ? (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent"
                />
                {t('api_error.retrying')}
              </span>
            ) : (
              t('common.retry')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
