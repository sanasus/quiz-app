import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { buttonClass } from './button-styles'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-8xl font-bold text-primary">404</h1>
      <p className="text-xl text-text-2">{t('common.not_found')}</p>
      <Link to="/" className={buttonClass('primary', 'md')}>
        {t('common.back')}
      </Link>
    </div>
  )
}
