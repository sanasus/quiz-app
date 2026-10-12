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
    <div className="flex gap-2">
      {difficulties.map((d) => (
        <button
          key={d.value}
          type="button"
          data-testid={`difficulty-${d.value}`}
          aria-pressed={selectedDifficulty === d.value}
          onClick={() => onSelect(d.value)}
          className={`flex-1 rounded-lg border-[3px] px-3 py-2 text-sm font-bold transition-all
            ${
              selectedDifficulty === d.value
                ? 'border-primary ring-2 ring-primary/30 bg-primary/20 text-primary scale-[1.03] cursor-pointer'
                : 'border-border bg-bg text-text-2 hover:border-primary/50 hover:bg-primary/5 hover:text-text cursor-pointer active:scale-[0.98]'
            }`}
        >
          {t(d.labelKey)}
        </button>
      ))}
    </div>
  )
}

export default DifficultySelector
