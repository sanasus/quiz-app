/**
 * Full answer review for /results: every attempted question with the
 * player's answer, the right one and the explanation, filterable to
 * mistakes only.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionAttempt } from '../../shared/types/quiz'
import { Card } from '../../shared/ui/card'
import { SectionTitle } from '../../shared/ui/heading'
import { SegmentedControl } from '../../shared/ui/segmented-control'

type Filter = 'mistakes' | 'all'

function optionTexts(attempt: SessionAttempt, ids: string[]): string {
  return ids
    .map((id) => attempt.question.options.find((o) => o.id === id)?.text ?? id)
    .join(', ')
}

export function AnswersReview({ attempts }: { attempts: SessionAttempt[] }) {
  const { t } = useTranslation()
  const mistakeCount = attempts.filter((a) => !a.correct).length
  // Mistakes first when there are any; a perfect run opens on everything.
  const [filter, setFilter] = useState<Filter>(
    mistakeCount > 0 ? 'mistakes' : 'all',
  )

  if (attempts.length === 0) return null

  const visible = attempts
    .map((attempt, index) => ({ attempt, number: index + 1 }))
    .filter(({ attempt }) => filter === 'all' || !attempt.correct)

  return (
    <Card className="mb-6">
      <SectionTitle>{t('results.review_title')}</SectionTitle>

      {mistakeCount > 0 && (
        <div className="mb-4">
          <SegmentedControl<Filter>
            label={t('results.review_filter')}
            testId="review-filter"
            value={filter}
            onChange={setFilter}
            options={[
              {
                value: 'mistakes',
                label: `${t('results.review_mistakes')} (${mistakeCount})`,
              },
              {
                value: 'all',
                label: `${t('results.review_all')} (${attempts.length})`,
              },
            ]}
          />
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {visible.map(({ attempt, number }) => (
          <li key={attempt.question.id}>
            <Card variant="inset" padding="sm">
              <p className="mb-1 font-medium text-text">
                <span className="text-text-3">{number}. </span>
                {attempt.question.text}
              </p>
              <div className="flex flex-col gap-1 text-body">
                {!attempt.correct && (
                  <span className="text-danger-ink">
                    ❌{' '}
                    {attempt.selectedOptionIds.length > 0
                      ? optionTexts(attempt, attempt.selectedOptionIds)
                      : t('results.no_answer')}
                  </span>
                )}
                <span className="text-success-ink">
                  ✅ {optionTexts(attempt, attempt.question.correctOptionIds)}
                </span>
              </div>
              {attempt.question.explanation && (
                <p className="mt-2 text-body text-text-2">
                  {attempt.question.explanation}
                </p>
              )}
            </Card>
          </li>
        ))}
      </ol>
    </Card>
  )
}
