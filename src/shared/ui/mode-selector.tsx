/**
 * ModeSelector — button group for selecting game mode.
 */

import { useTranslation } from 'react-i18next'
import type { QuizMode } from '../types/quiz'

export interface ModeOption {
  value: QuizMode
  labelKey: string
}

export interface ModeSelectorProps {
  modes: ModeOption[]
  selectedMode: QuizMode
  onSelect: (mode: QuizMode) => void
}

const ModeSelector = ({ modes, selectedMode, onSelect }: ModeSelectorProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          data-testid={`mode-${m.value}`}
          onClick={() => onSelect(m.value)}
          className={`flex-1 rounded-lg border-[3px] px-3 py-2 text-sm font-bold transition-all
            ${
              selectedMode === m.value
                ? 'border-primary ring-2 ring-primary/30 bg-primary/20 text-primary scale-[1.03] cursor-pointer'
                : 'border-border bg-bg text-text-2 hover:border-primary/50 hover:bg-primary/5 hover:text-text cursor-pointer active:scale-[0.98]'
            }`}
        >
          {t(m.labelKey)}
        </button>
      ))}
    </div>
  )
}

export default ModeSelector
