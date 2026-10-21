import { Flag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/ui/button'

export interface ReportQuestionButtonProps {
  reported: boolean
  onReport: () => void
}

/** «Question has an error» — hides the question from future quizzes. */
export function ReportQuestionButton({
  reported,
  onReport,
}: ReportQuestionButtonProps) {
  const { t } = useTranslation()

  return (
    <div className="mt-4 flex justify-end">
      <Button
        variant="ghost"
        size="sm"
        onClick={onReport}
        disabled={reported}
        data-testid="report-question"
      >
        <Flag className="size-4" aria-hidden />
        {reported ? t('quiz.reported_short') : t('quiz.report')}
      </Button>
    </div>
  )
}
