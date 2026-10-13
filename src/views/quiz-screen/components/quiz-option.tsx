import { memo } from 'react'
import { motion } from 'motion/react'
import { useMotionEnabled } from '../../../shared/lib/use-motion-enabled'

export interface QuizOptionProps {
  id: string
  text: string
  isSelected: boolean
  isCorrect: boolean
  showResult: boolean
  disabled: boolean
  onToggle: (optionId: string) => void
}

/** Shake keyframes for a wrongly picked option. */
const SHAKE = [0, -8, 8, -6, 6, -3, 3, 0]

export const QuizOption = memo(function QuizOption({
  id,
  text,
  isSelected,
  isCorrect,
  showResult,
  disabled,
  onToggle,
}: QuizOptionProps) {
  const motionEnabled = useMotionEnabled()

  let optionClass = 'border-border bg-bg text-text'
  let dataState: 'correct' | 'incorrect' | undefined
  let animate: 'idle' | 'shake' | 'pop' = 'idle'
  if (showResult) {
    if (isCorrect) {
      optionClass = 'border-success bg-success/10 text-success'
      dataState = 'correct'
      animate = 'pop'
    } else if (isSelected) {
      optionClass = 'border-danger bg-danger/10 text-danger'
      dataState = 'incorrect'
      animate = 'shake'
    }
  } else if (isSelected) {
    optionClass = 'border-primary bg-primary/10 text-primary'
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

  return (
    <motion.button
      data-testid={`option-${id}`}
      data-state={dataState}
      onClick={() => onToggle(id)}
      aria-selected={isSelected}
      className={`w-full rounded-lg border p-4 text-left text-sm transition-all hover:bg-muted ${optionClass}`}
      disabled={disabled}
      {...animateProps}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs">
          {id.toUpperCase()}
        </span>
        <span>{text}</span>
        {showResult && isCorrect ? (
          <span className="ml-auto text-success">✓</span>
        ) : null}
        {showResult && isSelected && !isCorrect ? (
          <span className="ml-auto text-danger">✗</span>
        ) : null}
      </div>
    </motion.button>
  )
})
