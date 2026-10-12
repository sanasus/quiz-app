/**
 * / — Home screen: welcome message and start button.
 */

import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function HomeScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-primary">
        🏠 {t('home.welcome')}
      </h1>
      <Link
        to="/setup"
        className="rounded-lg bg-primary px-6 py-3 text-lg font-bold text-white shadow-md transition-all hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
      >
        {t('home.start')}
      </Link>
    </div>
  )
}
