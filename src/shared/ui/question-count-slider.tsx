/**
 * QuestionCountSlider — range input for selecting number of questions.
 */

import { useTranslation } from 'react-i18next'

export interface QuestionCountSliderProps {
  value: number
  min?: number
  max?: number
  onChange: (count: number) => void
}

const QuestionCountSlider = ({
  value,
  min = 1,
  max = 50,
  onChange,
}: QuestionCountSliderProps) => {
  const { t } = useTranslation()

  return (
    <div className="group">
      <label
        htmlFor="question-count"
        className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default"
      >
        {t('setup.question_count')}
      </label>
      <input
        id="question-count"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary hover:accent-primary-active cursor-pointer"
      />
      <div
        data-testid="question-count-value"
        className="mt-1 text-center text-lg font-bold text-primary-ink"
      >
        {value}
      </div>
    </div>
  )
}

export default QuestionCountSlider
