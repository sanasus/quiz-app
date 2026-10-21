import { memo, useEffect, useRef } from 'react'
import { Card } from '../../../shared/ui/card'

export interface QuizQuestionProps {
  text: string
  description?: string
}

export const QuizQuestion = memo(function QuizQuestion({
  text,
  description,
}: QuizQuestionProps) {
  // The block is remounted per question: move focus to the new question so
  // keyboard and screen-reader users land on it instead of on <body> (the
  // button they just used is gone). `preventScroll` keeps the page steady.
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <Card padding="lg" className="mb-6">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mb-4 text-lg font-semibold text-text outline-none"
      >
        {text}
      </h3>
      {description ? (
        <p className="mb-4 text-body text-text-2">{description}</p>
      ) : null}
    </Card>
  )
})
