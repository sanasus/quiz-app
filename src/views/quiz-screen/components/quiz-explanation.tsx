import { memo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotionEnabled } from '../../../shared/lib/use-motion-enabled'
import { Card } from '../../../shared/ui/card'

export interface QuizExplanationProps {
  explanation: string
}

export const QuizExplanation = memo(function QuizExplanation({
  explanation,
}: QuizExplanationProps) {
  const { t } = useTranslation()
  const motionEnabled = useMotionEnabled()
  const ref = useRef<HTMLDivElement>(null)

  // Answer feedback the user hasn't seen yet is pointless: pull the
  // explanation into view when it renders below the fold. `nearest` is a
  // no-op when it already fits — no jump on tall screens. The scroll
  // margin keeps it clear of the sticky action tray below.
  useEffect(() => {
    ref.current?.scrollIntoView({
      behavior: motionEnabled ? 'smooth' : 'auto',
      block: 'nearest',
    })
  }, [motionEnabled])

  return (
    <Card ref={ref} variant="inset" className="mt-3 scroll-mb-24">
      <h4 className="mb-2 font-semibold text-text">{t('quiz.explanation')}</h4>
      <p className="text-body text-text-2">{explanation}</p>
    </Card>
  )
})
