/**
 * DifficultySelector — button group for selecting quiz difficulty.
 */

import { useTranslation } from 'react-i18next'
import { segmentClass } from './segment-styles'
import { DifficultySkeleton } from './skeletons'

export interface DifficultyOption {
  value: 'easy' | 'medium' | 'hard'
  labelKey: `setup.${'easy' | 'medium' | 'hard'}`
}

export interface DifficultySelectorProps {
  difficulties: DifficultyOption[]
  selectedDifficulty: 'easy' | 'medium' | 'hard'
  onSelect: (difficulty: 'easy' | 'medium' | 'hard') => void
  loading?: boolean
}

const DifficultySelector = ({
  difficulties,
  selectedDifficulty,
  onSelect,
  loading,
}: DifficultySelectorProps) => {
  const { t } = useTranslation()

  if (loading) {
    return <DifficultySkeleton />
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {difficulties.map((d) => (
        <button
          key={d.value}
          type="button"
          data-testid={`difficulty-${d.value}`}
          aria-pressed={selectedDifficulty === d.value}
          onClick={() => onSelect(d.value)}
          className={`${segmentClass(selectedDifficulty === d.value)}`}
        >
          {t(d.labelKey)}
        </button>
      ))}
    </div>
  )
}

export default DifficultySelector
