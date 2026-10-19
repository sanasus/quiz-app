import { memo } from 'react'

export interface QuizQuestionProps {
  text: string
  description?: string
}

export const QuizQuestion = memo(function QuizQuestion({
  text,
  description,
}: QuizQuestionProps) {
  return (
    <div className="mb-6 rounded-tile border border-border bg-surface p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-text">{text}</h3>
      {description ? (
        <p className="mb-4 text-sm text-text-2">{description}</p>
      ) : null}
    </div>
  )
})
