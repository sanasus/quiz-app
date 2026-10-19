/**
 * DifficultySelector — button group for selecting quiz difficulty.
 */

import { useTranslation } from 'react-i18next'
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
          className={`rounded-lg border-[3px] px-3 py-2 text-sm font-bold transition-[transform,box-shadow,background-color,border-color,color]
            ${
              selectedDifficulty === d.value
                ? 'border-primary ring-2 ring-primary/30 bg-primary/20 text-primary-ink scale-[1.03] cursor-pointer'
                : 'border-transparent bg-bg text-text-2 shadow-neu hover:shadow-neu-lift hover:text-text cursor-pointer'
            }`}
        >
          {t(d.labelKey)}
        </button>
      ))}
    </div>
  )
}

export default DifficultySelector
