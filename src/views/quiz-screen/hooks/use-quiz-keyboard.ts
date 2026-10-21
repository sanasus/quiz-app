/**
 * Keyboard controls for the quiz screen.
 *
 * - 1–9: answer with the option in that position (one pick answers)
 * - Enter: advance right away while the answer is shown (otherwise the
 *   screen advances by itself after a short pause)
 *
 * No manual pause by design — PLAN.md §2.1; timed modes pause
 * automatically while the answer is shown.
 *
 * Keys are ignored while focus sits in a form control or on a button
 * (native activation already handles Enter there).
 */

import { useEffect } from 'react'
import type { SessionStatus } from '../../../shared/types/quiz'

export interface QuizKeyboardOptions {
  optionCount: number
  status: SessionStatus
  onSelectIndex: (index: number) => void
  onNext: () => void
}

function isFormControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    tag === 'A' ||
    tag === 'LABEL' ||
    tag === 'SUMMARY' ||
    target.isContentEditable
  )
}

export function useQuizKeyboard({
  optionCount,
  status,
  onSelectIndex,
  onNext,
}: QuizKeyboardOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isFormControl(event.target)) return

      // Digits 1–9 select the option at that position.
      if (event.key >= '1' && event.key <= '9') {
        const index = Number(event.key) - 1
        if (index < optionCount && status === 'playing') {
          event.preventDefault()
          onSelectIndex(index)
        }
        return
      }

      if (event.key === 'Enter' && status === 'answered') {
        event.preventDefault()
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [optionCount, status, onSelectIndex, onNext])
}
