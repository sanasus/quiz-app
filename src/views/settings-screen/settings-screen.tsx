/**
 * /settings — language, theme, animation and question-source
 * preferences.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const THEME_OPTIONS: ReadonlyArray<{
  value: ThemeSetting
  labelKey: 'settings.light' | 'settings.dark' | 'settings.system'
  icon: string
}> = [
  { value: 'light', labelKey: 'settings.light', icon: '☀️' },
  { value: 'dark', labelKey: 'settings.dark', icon: '🌙' },
  { value: 'system', labelKey: 'settings.system', icon: '💻' },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', icon: '🇬🇧' },
  { value: 'ru', label: 'Русский', icon: '🇷🇺' },
] as const

// Decorative per-provider emoji (same pattern as THEME_OPTIONS).
const PROVIDER_ICONS: Record<ProviderId, string> = {
  quizapi: '🧠',
  trivia: '🎲',
  mock: '🧪',
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
      <h1 className="mb-8 text-center text-3xl font-bold text-text">
        ⚙️ {t('settings.title')}
      </h1>

      <div className="flex flex-col gap-8 rounded-card border border-border bg-surface p-6 shadow-card">
        {/* Language */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-text">{t('settings.language')}</h2>
          <SegmentedControl
            label={t('settings.language')}
            testId="language-selector"
            options={LANGUAGE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              icon: o.icon,
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
          <p className="text-xs text-text-2">
            {t('settings.api_provider_hint')}
          </p>
        </section>
      </div>

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

      <p className="mt-4 text-center text-sm text-text-3">
        {t('settings.theme_hint')}
      </p>
    </div>
  )
}
