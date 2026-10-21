/**
 * Pre-renders the share card when the results screen mounts, so the
 * click handler can call `share()` immediately (Safari user activation).
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../app/settings-store'
import type { SessionResult } from '../../shared/types/quiz'
import { buildShareCardData, buildShareText } from './share-card-data'
import { renderShareCard } from './render-share-card'
import { shareResult, type ShareOutcome } from './share-result'

interface ShareMetrics {
  level: number
  isNewRecord: boolean
}

export interface ShareCard {
  /** The PNG is rendered and a click can share it right away. */
  ready: boolean
  /** Rendering failed — the button should stay hidden. */
  failed: boolean
  share: () => Promise<ShareOutcome | null>
}

export function useShareCard(
  result: SessionResult | null,
  metrics: ShareMetrics | null,
): ShareCard {
  const { t, i18n } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const locale = i18n.resolvedLanguage ?? 'en'

  const [blob, setBlob] = useState<Blob | null>(null)
  const [failed, setFailed] = useState(false)

  const level = metrics?.level
  const isNewRecord = metrics?.isNewRecord

  useEffect(() => {
    if (!result || level === undefined || isNewRecord === undefined) return

    let cancelled = false
    const data = buildShareCardData(
      result,
      { level, isNewRecord, domain: window.location.host },
      t,
      locale,
    )
    renderShareCard(data).then(
      (png) => {
        if (cancelled) return
        setBlob(png)
        setFailed(false)
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
    // `theme` re-renders the card after a theme switch (colors are read
    // from the DOM at render time).
  }, [result, level, isNewRecord, t, locale, theme])

  const share = useCallback(async () => {
    if (!blob || !result) return null
    return shareResult({
      blob,
      text: buildShareText(result, t, locale),
      filename: 'quiz-result.png',
    })
  }, [blob, result, t, locale])

  return { ready: blob !== null, failed, share }
}
