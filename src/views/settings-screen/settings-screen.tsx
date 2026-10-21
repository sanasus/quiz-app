/**
 * /settings — language, theme, animation and question-source
 * preferences.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Brain, Dices, FlaskConical, Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettingsStore } from '../../app/settings-store'
import type { ThemeSetting } from '../../app/settings-store'
import { SegmentedControl, Toggle } from '../../shared/ui/segmented-control'
import { ConfirmDialog } from '../../shared/ui/confirm-dialog'
import { useProviderStore } from '../../shared/api/provider-store'
import { PROVIDERS, getSwitcherProviders } from '../../shared/api/providers'
import type { ProviderId } from '../../shared/api/providers'
import {
  isSessionActive,
  useQuizSessionStore,
} from '../../shared/lib/session-store'
import { useChangeProvider } from '../../features/provider/use-change-provider'
import { BackupSection } from '../../features/backup/backup-section'
import { Card } from '../../shared/ui/card'
import { PageTitle } from '../../shared/ui/heading'

const THEME_OPTIONS: ReadonlyArray<{
  value: ThemeSetting
  labelKey: 'settings.light' | 'settings.dark' | 'settings.system'
  icon: LucideIcon
}> = [
  { value: 'light', labelKey: 'settings.light', icon: Sun },
  { value: 'dark', labelKey: 'settings.dark', icon: Moon },
  { value: 'system', labelKey: 'settings.system', icon: Monitor },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
] as const

// Decorative per-provider icon (same pattern as THEME_OPTIONS).
const PROVIDER_ICONS: Record<ProviderId, LucideIcon> = {
  quizapi: Brain,
  trivia: Dices,
  mock: FlaskConical,
}

export function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const animations = useSettingsStore((s) => s.animations)
  const setAnimations = useSettingsStore((s) => s.setAnimations)
  const providerId = useProviderStore((s) => s.providerId)
  const sessionStatus = useQuizSessionStore((s) => s.status)
  const changeProvider = useChangeProvider()
  // A switch requested during a session — held until the user confirms.
  const [pendingProvider, setPendingProvider] = useState<ProviderId | null>(
    null,
  )

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng).catch(() => {})
  }

  const handleProviderChange = (id: ProviderId) => {
    if (id === providerId) return
    if (isSessionActive(sessionStatus)) {
      setPendingProvider(id)
      return
    }
    changeProvider(id)
  }

  const confirmProviderSwitch = () => {
    if (pendingProvider) changeProvider(pendingProvider)
    setPendingProvider(null)
  }

  return (
    <div
      className="mx-auto max-w-lg animate-fade-in px-4 py-8"
      data-testid="settings-screen"
    >
      <PageTitle className="mb-8">{t('settings.title')}</PageTitle>

      <Card padding="lg" className="flex flex-col gap-8">
        {/* Language */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-text">{t('settings.language')}</h2>
          <SegmentedControl
            label={t('settings.language')}
            testId="language-selector"
            options={LANGUAGE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={(i18n.language === 'ru' ? 'ru' : 'en') as 'en' | 'ru'}
            onChange={changeLanguage}
          />
        </section>

        {/* Theme */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-text">{t('settings.theme')}</h2>
          <SegmentedControl
            label={t('settings.theme')}
            testId="theme-selector"
            options={THEME_OPTIONS.map((o) => ({
              value: o.value,
              label: t(o.labelKey),
              icon: o.icon,
            }))}
            value={theme}
            onChange={setTheme}
          />
        </section>

        {/* Animations */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-text">
            {t('settings.animations')}
          </h2>
          <Toggle
            testId="animations-toggle"
            label={t('settings.animations_hint')}
            pressed={animations}
            onChange={setAnimations}
            onLabel={t('settings.on')}
            offLabel={t('settings.off')}
          />
        </section>

        {/* Question source (API provider) */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-text">
            {t('settings.api_provider')}
          </h2>
          <SegmentedControl<ProviderId>
            label={t('settings.api_provider')}
            testId="provider-selector"
            options={getSwitcherProviders(providerId).map((id) => ({
              value: id,
              label: t(PROVIDERS[id].labelKey),
              icon: PROVIDER_ICONS[id],
            }))}
            value={providerId}
            onChange={handleProviderChange}
          />
          <p className="text-caption text-text-2">
            {t('settings.api_provider_hint')}
          </p>
        </section>

        <BackupSection />
      </Card>

      {/* Switching during a live session must be confirmed — the
          switch resets the session and returns to /setup. */}
      <ConfirmDialog
        open={pendingProvider !== null}
        testId="provider-switch-confirm"
        title={t('settings.api_provider_switch_confirm_title')}
        message={t('settings.api_provider_switch_confirm')}
        onConfirm={confirmProviderSwitch}
        onCancel={() => setPendingProvider(null)}
      />

      <p className="mt-4 text-center text-body text-text-3">
        {t('settings.theme_hint')}
      </p>
    </div>
  )
}
