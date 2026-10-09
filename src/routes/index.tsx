import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// eslint-disable-next-line react/only-export-components
function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-primary">
        🏠 {t('home.welcome')}
      </h1>
      <p className="text-text-2">{t('home.start')}</p>
    </div>
  )
}
