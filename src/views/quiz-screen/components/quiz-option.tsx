import { memo } from 'react'
import { motion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { useMotionEnabled } from '../../../shared/lib/use-motion-enabled'

export interface QuizOptionProps {
  id: string
  text: string
  /** Zero-based position — used for the A/B/C/D badge, never the raw id. */
  index: number
  isSelected: boolean
  isCorrect: boolean
  showResult: boolean
  disabled: boolean
  onSelect: (optionId: string) => void
}

/** Single-letter badge label: 0 → A, 1 → B, … 25 → Z, then the number. */
function badgeLabel(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index)
  return String(index + 1)
}

/** Shake keyframes for a wrongly picked option. */
const SHAKE = [0, -8, 8, -6, 6, -3, 3, 0]

export const QuizOption = memo(function QuizOption({
  id,
  text,
  index,
  isSelected,
  isCorrect,
  showResult,
  disabled,
  onSelect,
}: QuizOptionProps) {
  const motionEnabled = useMotionEnabled()

  let optionClass = 'border-transparent bg-bg text-text shadow-neu'
  let dataState: 'correct' | 'incorrect' | undefined
  let animate: 'idle' | 'shake' | 'pop' = 'idle'
  if (showResult) {
    if (isCorrect) {
      optionClass = 'border-success bg-bg text-success-ink shadow-neu-inset'
      dataState = 'correct'
      animate = 'pop'
    } else if (isSelected) {
      optionClass = 'border-danger bg-bg text-danger-ink shadow-neu-inset'
      dataState = 'incorrect'
      animate = 'shake'
    } else {
      // Not chosen, not right: step back so the answer stays the focus.
      // Muted via border + text colour (not opacity) to keep text legible.
      optionClass = 'border-transparent bg-bg text-text-3'
    }
  } else if (isSelected) {
    optionClass = 'border-primary bg-bg text-primary-ink shadow-neu-inset'
  }

  const animateProps = motionEnabled
    ? {
        animate,
        variants: {
          idle: { x: 0, scale: 1 },
          shake: { x: SHAKE, scale: 1 },
          pop: { x: 0, scale: [1, 1.03, 1] },
        },
        transition: { duration: 0.4, ease: 'easeInOut' as const },
      }
    : {}

  // Hover feedback only while the option is still interactive — after the
  // answer it would otherwise override the result tint.
  const hoverClass = disabled ? '' : 'hover:shadow-neu-lift'

  return (
    <motion.button
      data-testid={`option-${id}`}
      data-state={dataState}
      onClick={() => onSelect(id)}
      aria-selected={isSelected}
      role="option"
      className={`w-full rounded-lg border p-4 text-left text-body transition-colors disabled:cursor-not-allowed ${showResult ? '' : 'disabled:opacity-75'} ${hoverClass} ${optionClass}`}
      disabled={disabled}
      {...animateProps}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption shadow-neu-inset-sm">
          {badgeLabel(index)}
        </span>
        <span className="min-w-0 break-words">{text}</span>
        {showResult && isCorrect ? (
          <Check
            className="ml-auto h-4 w-4 text-success-ink"
            aria-hidden="true"
          />
        ) : null}
        {showResult && isSelected && !isCorrect ? (
          <X className="ml-auto h-4 w-4 text-danger-ink" aria-hidden="true" />
        ) : null}
      </div>
    </motion.button>
  )
})
