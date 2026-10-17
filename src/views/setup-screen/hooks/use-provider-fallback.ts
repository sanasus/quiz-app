/**
 * Auto provider fallback for the setup screen (T7).
 *
 * The setup screen has no session, so a *broken* provider — auth /
 * rate_limit / parse / http, or a timeout (the provider hung: its
 * fault, not the user's connection, HAR-verified) — is fixed by
 * switching to the other provider with a toast, once per screen mount.
 * Network failures never switch — they show an inline error with a
 * Retry, as does a second provider failing after the auto-switch (no
 * switch loops).
 *
 * There is a single catalog query since the proxy merged metadata +
 * categories into one request, so the policy reads one error instead
 * of reconciling two.
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QuizApiError } from '../../../shared/api/errors'
import { useProviderStore } from '../../../shared/api/provider-store'
import { alternateProviderId } from '../../../shared/api/providers'
import { useChangeProvider } from '../../../features/provider/use-change-provider'

export interface ProviderFallbackInput {
  catalogError: Error | null
  refetchCatalog: () => void
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
  /** Retry the setup query (inline error's action). */
  retry: () => void
}

/**
 * A failure of the provider itself, not of the user's connection.
 * timeout = the provider hung — its fault, not the connection's
 * (HAR-verified); network alone stays the user's own problem (see the
 * error-policy matrix).
 */
function isBrokenProviderError(error: Error | null): boolean {
  return error instanceof QuizApiError && error.kind !== 'network'
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
  // null = no switch has fired yet; otherwise the error it fired on.
  const [switchedFrom, setSwitchedFrom] = useState<Error | null>(null)

  const { catalogError } = input
  const broken = isBrokenProviderError(catalogError)

  useEffect(() => {
    if (!broken || switchedFrom || catalogError === null) return
    // Side effect by design: reacting to a query state change by
    // switching the provider (store + navigate) and recording it —
    // not derivable during render.
    // eslint-disable-next-line react/set-state-in-effect
    setSwitchedFrom(catalogError)

    const next = alternateProviderId(useProviderStore.getState().providerId)
    setToast({
      title: t('provider_switch.toast_title'),
      message: t('provider_switch.toast_message', {
        provider: t(`provider.${next}`),
      }),
    })
    changeProvider(next)
  }, [broken, switchedFrom, changeProvider, t, catalogError])

  // Before any switch the current error is the one to report. After it,
  // only a *new* error counts — the old provider's leftovers (the query
  // refetches under the new key) must not resurface as an inline error.
  const inlineSource =
    switchedFrom === null
      ? catalogError
      : catalogError !== switchedFrom
        ? catalogError
        : null

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
    retry: () => input.refetchCatalog(),
  }
}
