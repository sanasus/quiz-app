import { useEffect, useRef } from 'react'
import type { Question } from '../../../shared/types/quiz'

/**
 * Highlight style for correct answers in the dev console (`%c`):
 * a green pill so the answer stands out from the question text.
 */
export const CORRECT_ANSWER_STYLE =
  'color:#4ade80;background:rgba(74,222,128,0.15);' +
  'padding:1px 6px;border-radius:4px;font-weight:600'

/** A literal `%` in question/answer text must be escaped for console.format. */
const escapeFormat = (text: string) => text.replaceAll('%', '%%')

/**
 * Dev-only console hint: prints the correct answer as soon as a
 * question becomes visible, so manual testing doesn't require
 * answering first. No-op outside `import.meta.env.DEV`.
 *
 * The ref guards against StrictMode re-running effects in dev, which
 * would otherwise log every question twice (rerender-effect-once).
 */
export function useDevAnswerHint(question: Question | null): void {
  const lastLoggedId = useRef<string | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // A null question clears the dedup marker, so an in-place restart
    // (reset → same question again) would still print the hint.
    if (!question) {
      lastLoggedId.current = null
      return
    }
    if (lastLoggedId.current === question.id) return
    lastLoggedId.current = question.id

    const correctText = question.correctOptionIds.map(
      (id) => question.options.find((option) => option.id === id)?.text ?? id,
    )
    // Every answer is wrapped in `%c…%c`: the first marker applies
    // CORRECT_ANSWER_STYLE, the closing one resets to the default.
    const styledAnswers = correctText
      .map((text) => `%c${escapeFormat(text)}%c`)
      .join(', ')
    const styleArgs = correctText.flatMap(() => [CORRECT_ANSWER_STYLE, ''])
    const label = `${escapeFormat(question.id)} «${escapeFormat(question.text)}»`
    const ids = escapeFormat(question.correctOptionIds.join(', '))
    console.log(
      `[quiz] ${label} → ${styledAnswers} (ids: ${ids})`,
      ...styleArgs,
    )
  }, [question])
}
