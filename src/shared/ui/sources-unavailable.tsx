/**
 * «Question sources unavailable» — the one state shown when both live
 * providers have failed. Switching between them cannot help, so instead
 * of another switch offer it explains that and lets the player retry
 * either source.
 */

import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ApiProviderId } from '../api/errors'
import { Button } from './button'
import { Card } from './card'

const PROVIDER_ORDER: readonly ApiProviderId[] = ['quizapi', 'trivia']

export interface SourcesUnavailableProps {
  /** A retry is in flight — the buttons are disabled. */
  busy: boolean
  onRetry: (providerId: ApiProviderId) => void
}

export function SourcesUnavailable({ busy, onRetry }: SourcesUnavailableProps) {
  const { t } = useTranslation()

  return (
    <Card
      padding="lg"
      role="alert"
      data-testid="sources-unavailable"
      className="flex flex-col items-center gap-4 text-center"
    >
      <TriangleAlert className="h-12 w-12 text-danger-ink" aria-hidden="true" />
      <h2 className="text-subheading text-text">
        {t('sources_unavailable.title')}
      </h2>
      <p className="max-w-sm text-body text-text-2">
        {t('sources_unavailable.message')}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {PROVIDER_ORDER.map((id) => (
          <Button
            key={id}
            variant="secondary"
            size="sm"
            disabled={busy}
            data-testid={`retry-${id}`}
            onClick={() => onRetry(id)}
          >
            {busy
              ? t('sources_unavailable.retrying')
              : t('sources_unavailable.retry', {
                  provider: t(`provider.${id}`),
                })}
          </Button>
        ))}
      </div>
    </Card>
  )
}
