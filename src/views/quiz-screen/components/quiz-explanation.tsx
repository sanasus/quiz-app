import { useTranslation } from 'react-i18next'

export interface QuizExplanationProps {
  explanation: string
}

export function QuizExplanation({ explanation }: QuizExplanationProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-6 rounded-lg border border-border bg-muted p-4">
      <h4 className="mb-2 font-semibold text-text-1">
        {t('quiz.explanation')}
      </h4>
      <p className="text-sm text-text-2">{explanation}</p>
    </div>
  )
}
