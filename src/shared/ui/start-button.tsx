/**
 * StartButton — primary action button with loading state.
 */

import { useTranslation } from 'react-i18next'
import { Button } from './button'

export interface StartButtonProps {
  loading?: boolean
  onClick: () => void
}

const StartButton = ({ loading, onClick }: StartButtonProps) => {
  const { t } = useTranslation()

  return (
    <Button
      size="lg"
      className="mt-2 w-full"
      loading={loading}
      onClick={onClick}
    >
      {t('setup.start')}
    </Button>
  )
}

export default StartButton
