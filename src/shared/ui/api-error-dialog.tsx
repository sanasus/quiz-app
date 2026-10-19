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
import { Button } from './button'
import { Modal } from './modal'

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
    <Modal labelledBy="api-error-title" describedBy="api-error-message">
      <h2 id="api-error-title" className="mb-2 text-lg font-bold text-text">
        {t('api_error.title')}
      </h2>
      <p
        id="api-error-message"
        className={`text-body text-text-2 ${errorMessage ? 'mb-2' : 'mb-6'}`}
      >
        {t('api_error.message', { provider: t(providerLabelKey) })}
      </p>
      {errorMessage ? (
        <p className="mb-6 break-words text-caption text-text-2 opacity-75">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          // Wrapped on purpose: passing the raw handler would leak
          // the click event into a `changeProvider(next?)` caller,
          // which would swallow it as a provider id.
          onClick={() => onChangeApi()}
          disabled={busy}
          data-testid="api-error-change"
        >
          {t('api_error.change_api')}
        </Button>
        <Button
          ref={retryRef}
          size="sm"
          onClick={() => onRetry()}
          disabled={busy}
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
        </Button>
      </div>
    </Modal>
  )
}
