export interface QuizOptionProps {
  id: string
  text: string
  isSelected: boolean
  isCorrect: boolean
  showResult: boolean
  disabled: boolean
  onToggle: () => void
}

export function QuizOption({
  id,
  text,
  isSelected,
  isCorrect,
  showResult,
  disabled,
  onToggle,
}: QuizOptionProps) {
  let optionClass = 'border-border bg-bg text-text'
  if (showResult) {
    if (isCorrect) {
      optionClass = 'border-green-500 bg-green-500/10 text-green-400'
    } else if (isSelected && !isCorrect) {
      optionClass = 'border-red-500 bg-red-500/10 text-red-400'
    }
  } else if (isSelected) {
    optionClass = 'border-primary bg-primary/10 text-primary'
  }

  return (
    <button
      key={id}
      data-testid={`option-${id}`}
      onClick={onToggle}
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
}
