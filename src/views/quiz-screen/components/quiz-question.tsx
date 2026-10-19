import { memo } from 'react'
import { Card } from '../../../shared/ui/card'

export interface QuizQuestionProps {
  text: string
  description?: string
}

export const QuizQuestion = memo(function QuizQuestion({
  text,
  description,
}: QuizQuestionProps) {
  return (
    <Card padding="lg" className="mb-6">
      <h3 className="mb-4 text-lg font-semibold text-text">{text}</h3>
      {description ? (
        <p className="mb-4 text-sm text-text-2">{description}</p>
      ) : null}
    </Card>
  )
})
