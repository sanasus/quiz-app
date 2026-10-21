import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { QuizOption } from './quiz-option'

export interface QuizOptionsProps {
  options: Array<{ id: string; text: string }>
  correctOptionIds: readonly string[]
  selectedIds: readonly string[]
  status: string
  onSelect: (optionId: string) => void
}

export const QuizOptions = memo(function QuizOptions({
  options,
  correctOptionIds,
  selectedIds,
  status,
  onSelect,
}: QuizOptionsProps) {
  const { t } = useTranslation()
  const answered = status === 'answered'
  // Set lookups instead of per-option Array.includes (js-set-map-lookups)
  const correctSet = new Set(correctOptionIds)
  const selectedSet = new Set(selectedIds)

  return (
    <div role="listbox" aria-label={t('quiz.question')} className="space-y-3">
      {options.map((option, index) => (
        <QuizOption
          key={option.id}
          id={option.id}
          text={option.text}
          index={index}
          isSelected={selectedSet.has(option.id)}
          isCorrect={correctSet.has(option.id)}
          showResult={answered}
          disabled={answered}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
})
