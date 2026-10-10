import { QuizOption } from './quiz-option'

export interface QuizOptionsProps {
  options: Array<{ id: string; text: string }>
  correctOptionIds: readonly string[]
  selectedIds: readonly string[]
  status: string
  onToggle: (optionId: string) => void
}

export function QuizOptions({
  options,
  correctOptionIds,
  selectedIds,
  status,
  onToggle,
}: QuizOptionsProps) {
  const showResult = status === 'answered'
  const correctSet = new Set(correctOptionIds)

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.id)
        const isCorrect = correctSet.has(option.id)

        return (
          <QuizOption
            key={option.id}
            id={option.id}
            text={option.text}
            isSelected={isSelected}
            isCorrect={isCorrect}
            showResult={showResult}
            disabled={status === 'answered'}
            onToggle={() => onToggle(option.id)}
          />
        )
      })}
    </div>
  )
}
