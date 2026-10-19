/**
 * ModeSelector — button group for selecting game mode.
 */

import { useTranslation } from 'react-i18next'
import { segmentClass } from './segment-styles'
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
          aria-pressed={selectedMode === m.value}
          onClick={() => onSelect(m.value)}
          className={`flex-1 ${segmentClass(selectedMode === m.value)}`}
        >
          {t(m.labelKey)}
        </button>
      ))}
    </div>
  )
}

export default ModeSelector
