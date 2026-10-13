/**
 * /settings — language, theme, and animation preferences.
 */

import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../app/settings-store'
import type { ThemeSetting } from '../../app/settings-store'
import { SegmentedControl, Toggle } from '../../shared/ui/segmented-control'

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

export function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const animations = useSettingsStore((s) => s.animations)
  const setAnimations = useSettingsStore((s) => s.setAnimations)

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng).catch(() => {})
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
      </div>

      <p className="mt-4 text-center text-sm text-text-3">
        {t('settings.theme_hint')}
      </p>
    </div>
  )
}
