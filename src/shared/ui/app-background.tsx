/**
 * App background — a fixed, non-interactive layer: soft colour "aura"
 * blobs plus a fine grain. While a quiz is running the aura takes a hue
 * derived from the active category; elsewhere it stays on the brand colour.
 * Right after an answer it flashes green (correct) or red (wrong).
 */

import { useEffect, useState, type CSSProperties } from 'react'
import { isSessionActive, useQuizSessionStore } from '../lib/session-store'

/** Brand hue (oklch) of --color-primary. */
const BRAND_HUE = 285
const SUCCESS_HUE = 160
const DANGER_HUE = 25
const FLASH_MS = 1200

type Verdict = 'correct' | 'wrong'

/** Stable hue for any category id, whichever provider it comes from. */
function categoryHue(category: string | undefined): number {
  if (!category || category === 'all') return BRAND_HUE
  let hash = 0
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % 360
}

/**
 * Verdict on the current question once answered; otherwise null. A
 * timeout leaves no selection, which counts as wrong.
 */
function useVerdict(): { key: string; verdict: Verdict } | null {
  const key = useQuizSessionStore((s) => {
    if (s.status !== 'answered') return null
    const q = s.questions[s.currentIndex]
    if (!q) return null
    const selected = s.answers[q.id] ?? []
    const correct =
      q.correctOptionIds.length === selected.length &&
      q.correctOptionIds.every((id) => selected.includes(id))
    return `${q.id}:${correct ? 'correct' : 'wrong'}`
  })
  if (!key) return null
  return { key, verdict: key.endsWith(':correct') ? 'correct' : 'wrong' }
}

export function AppBackground() {
  const category = useQuizSessionStore((s) =>
    isSessionActive(s.status) ? s.config.category : undefined,
  )
  const answered = useVerdict()
  const flashKey = answered?.key
  // The answer whose flash already ran its course; the flash itself is
  // derived during render, the timer only marks it as spent.
  const [spentKey, setSpentKey] = useState<string | null>(null)
  const flash = answered && answered.key !== spentKey ? answered.verdict : null

  useEffect(() => {
    if (!flashKey) return
    const id = setTimeout(() => setSpentKey(flashKey), FLASH_MS)
    return () => {
      clearTimeout(id)
      // Leaving "answered" re-arms the flash for a repeated question id.
      setSpentKey(null)
    }
  }, [flashKey])

  const hue =
    flash === 'correct'
      ? SUCCESS_HUE
      : flash === 'wrong'
        ? DANGER_HUE
        : categoryHue(category)

  return (
    <div
      aria-hidden="true"
      data-testid="app-background"
      data-flash={flash ?? undefined}
      className="app-bg"
      style={{ '--aura-hue': hue } as CSSProperties}
    />
  )
}
