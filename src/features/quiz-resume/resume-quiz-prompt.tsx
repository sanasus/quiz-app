/**
 * «Continue the quiz?» — shown on / and /setup while a run that survived
 * a reload (or tab eviction) is still in progress.
 */

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { trackRunAbandoned } from '../../shared/analytics/run-events'
import { Button } from '../../shared/ui/button'
import { Modal } from '../../shared/ui/modal'
import { useQuizSessionStore } from '../../shared/lib/session-store'

export function ResumeQuizPrompt() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const status = useQuizSessionStore((s) => s.status)
  const config = useQuizSessionStore((s) => s.config)
  const current = useQuizSessionStore((s) => s.currentIndex + 1)
  const total = useQuizSessionStore((s) => s.questions.length)
  const reset = useQuizSessionStore((s) => s.reset)
  const [dismissed, setDismissed] = useState(false)

  const inProgress = status === 'playing' || status === 'answered'
  if (!inProgress || dismissed) return null

  const handleContinue = () => {
    navigate({
      to: '/quiz',
      search: {
        category: config.category,
        difficulty: config.difficulty,
        questionCount: config.questionCount,
        mode: config.mode,
      },
    })
  }

  return (
    <Modal
      labelledBy="resume-quiz-title"
      describedBy="resume-quiz-message"
      testId="resume-quiz"
      onDismiss={() => setDismissed(true)}
    >
      <h2 id="resume-quiz-title" className="mb-2 text-lg font-bold text-text">
        {t('resume.title')}
      </h2>
      <p id="resume-quiz-message" className="mb-6 text-body text-text-2">
        {t('resume.message', {
          mode: t(`setup.${config.mode}`),
          current,
          total,
        })}
      </p>
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            trackRunAbandoned()
            reset()
          }}
        >
          {t('resume.restart')}
        </Button>
        <Button size="sm" onClick={handleContinue}>
          {t('resume.continue')}
        </Button>
      </div>
    </Modal>
  )
}
