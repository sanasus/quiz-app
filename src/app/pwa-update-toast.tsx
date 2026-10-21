/**
 * «A new version is available» — shown when the service worker has a
 * waiting update. Updating reloads the page, so it is the player's call
 * (`registerType: 'prompt'`), never silent. A run in progress survives
 * the reload (session store) but the leave guard still asks first.
 */

import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from 'react-i18next'
import { Button } from '../shared/ui/button'
import { Card } from '../shared/ui/card'

export function PwaUpdateToast() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4"
    >
      <Card
        variant="overlay"
        className="flex w-full max-w-sm items-center gap-3 border-2 border-primary"
      >
        <p className="min-w-0 flex-1 text-body text-text">
          {t('pwa.update_available')}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
          {t('pwa.later')}
        </Button>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          {t('pwa.update')}
        </Button>
      </Card>
    </div>
  )
}
