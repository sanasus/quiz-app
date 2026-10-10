/**
 * StartButton — primary action button with loading state.
 */

import { useTranslation } from 'react-i18next'

export interface StartButtonProps {
  loading?: boolean
  onClick: () => void
}

const StartButton = ({ loading, onClick }: StartButtonProps) => {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`mt-2 w-full rounded-lg bg-primary px-6 py-3 text-lg font-bold text-white shadow-md transition-all cursor-pointer
        ${
          loading
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:shadow-md'
        }`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          {t('setup.start')}
        </span>
      ) : (
        t('setup.start')
      )}
    </button>
  )
}

export default StartButton
