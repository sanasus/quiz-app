/**
 * Auto provider fallback for the setup screen (T7).
 *
 * The setup screen has no session, so a *broken* provider — auth /
 * rate_limit / parse / http, or a timeout (the provider hung past
 * REQUEST_TIMEOUT_MS: its fault, not the user's connection, HAR-
 * verified) — is fixed by switching to the other provider with a
 * toast, once per screen mount. Network failures never switch — they
 * show an inline error with a Retry, as does a second provider
 * failing after the auto-switch (no switch loops).
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QuizApiError } from '../../../shared/api/errors'
import { useProviderStore } from '../../../shared/api/provider-store'
import { alternateProviderId } from '../../../shared/api/providers'
import { useChangeProvider } from '../../../features/provider/use-change-provider'

export interface ProviderFallbackInput {
  metadataError: Error | null
  categoriesError: Error | null
  refetchMetadata: () => void
  refetchCategories: () => void
}

export interface ProviderFallbackResult {
  /**
   * Raw message for the inline error block (network failure, or the
   * new provider failing after the auto-switch). Null while the
   * auto-switch handles the failure or when there is none.
   */
  inlineError: string | null
  /** Switch-confirmation toast; null when no switch happened. */
  toast: { title: string; message: string } | null
  dismissToast: () => void
  /** Retry both setup queries (inline error's action). */
  retryAll: () => void
}

/** Errors present at the moment the auto-switch fired. */
interface SwitchedFrom {
  metadata: Error | null
  categories: Error | null
}

/**
 * A failure of the provider itself, not of the user's connection.
 * timeout = the provider hung past REQUEST_TIMEOUT_MS — its fault,
 * not the user's connection (HAR-verified); network alone stays the
 * user's own problem (see the error-policy matrix).
 */
function isBrokenProviderError(error: Error | null): boolean {
  return error instanceof QuizApiError && error.kind !== 'network'
}

/**
 * The error the inline block should report. After an auto-switch only
 * a *new* error counts — the old provider's leftovers (the queries
 * refetch under the new key) must not resurface as an inline error.
 */
function pickInlineError(
  metadataError: Error | null,
  categoriesError: Error | null,
  switchedFrom: SwitchedFrom | null,
): Error | null {
  if (switchedFrom === null) return metadataError ?? categoriesError
  const newMetadata =
    metadataError !== switchedFrom.metadata ? metadataError : null
  const newCategories =
    categoriesError !== switchedFrom.categories ? categoriesError : null
  return newMetadata ?? newCategories
}

export function useProviderFallback(
  input: ProviderFallbackInput,
): ProviderFallbackResult {
  const { t } = useTranslation()
  const changeProvider = useChangeProvider()
  const [toast, setToast] = useState<{ title: string; message: string } | null>(
    null,
  )
  // Set when the one allowed auto-switch fires (once per mount — if the
  // new provider fails too, the inline error takes over, no loops).
  // State, not a ref: read during render to derive the inline error.
  const [switchedFrom, setSwitchedFrom] = useState<SwitchedFrom | null>(null)

  const { metadataError, categoriesError } = input
  // Any broken-kind error wins over a network one — the whole provider
  // is unusable regardless of the other query's failure.
  const broken =
    isBrokenProviderError(metadataError) ||
    isBrokenProviderError(categoriesError)

  useEffect(() => {
    if (!broken || switchedFrom) return
    // Side effect by design: reacting to a query state change by
    // switching the provider (store + navigate) and recording it —
    // not derivable during render.
    // eslint-disable-next-line react/set-state-in-effect
    setSwitchedFrom({ metadata: metadataError, categories: categoriesError })

    const next = alternateProviderId(useProviderStore.getState().providerId)
    setToast({
      title: t('provider_switch.toast_title'),
      message: t('provider_switch.toast_message', {
        provider: t(`provider.${next}`),
      }),
    })
    changeProvider(next)
  }, [broken, switchedFrom, changeProvider, t, metadataError, categoriesError])

  const inlineSource = pickInlineError(
    metadataError,
    categoriesError,
    switchedFrom,
  )
  // Inline instead of switching: a non-broken failure, or any *new*
  // failure after the auto-switch has been spent.
  const inlineError =
    inlineSource !== null && (!broken || switchedFrom !== null)
      ? inlineSource.message
      : null

  return {
    inlineError,
    toast,
    dismissToast: () => setToast(null),
    retryAll: () => {
      input.refetchMetadata()
      input.refetchCategories()
    },
  }
}
