import { memo } from 'react'

export interface QuizOptionProps {
  id: string
  text: string
  isSelected: boolean
  isCorrect: boolean
  showResult: boolean
  disabled: boolean
  onToggle: (optionId: string) => void
}

export const QuizOption = memo(function QuizOption({
  id,
  text,
  isSelected,
  isCorrect,
  showResult,
  disabled,
  onToggle,
}: QuizOptionProps) {
  let optionClass = 'border-border bg-bg text-text'
  let dataState: 'correct' | 'incorrect' | undefined
  if (showResult) {
    if (isCorrect) {
      optionClass = 'border-green-500 bg-green-500/10 text-green-400'
      dataState = 'correct'
    } else if (isSelected) {
      optionClass = 'border-red-500 bg-red-500/10 text-red-400'
      dataState = 'incorrect'
    }
  } else if (isSelected) {
    optionClass = 'border-primary bg-primary/10 text-primary'
  }

  return (
    <button
      data-testid={`option-${id}`}
      data-state={dataState}
      onClick={() => onToggle(id)}
      aria-selected={isSelected}
      className={`w-full rounded-lg border p-4 text-left text-sm transition-all hover:bg-muted ${optionClass}`}
      disabled={disabled}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs">
          {id.toUpperCase()}
        </span>
        <span>{text}</span>
        {showResult && isCorrect ? (
          <span className="ml-auto text-green-400">✓</span>
        ) : null}
        {showResult && isSelected && !isCorrect ? (
          <span className="ml-auto text-red-400">✗</span>
        ) : null}
      </div>
    </button>
  )
})
