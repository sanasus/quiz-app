import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

// eslint-disable-next-line react/only-export-components
export const Route = createFileRoute('/404')({
  component: NotFoundPage,
})

// eslint-disable-next-line react/only-export-components
export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-8xl font-bold text-primary">404</h1>
      <p className="text-xl text-text-2">{t('common.not_found')}</p>
      <Link
        to="/"
        className="rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/90"
      >
        {t('common.back')}
      </Link>
    </div>
  )
}
