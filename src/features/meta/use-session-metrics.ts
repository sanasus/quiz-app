/**
 * Session metrics integration — folds a finished session into the
 * meta-layer exactly once: stats → achievements → XP.
 *
 * Idempotency guard: the stats history head carries the processed
 * session's `finishedAt`, so remounts (and double effects in Strict
 * Mode) never double-count a session.
 */

import { useEffect, useState } from 'react'
import { useQuizSessionStore } from '../../shared/lib/session-store'
import { useStatsStore } from '../stats/stats-store'
import { applySessionToStats, toIsoDate } from '../stats/stats-logic'
import { useAchievementsStore } from '../achievements/achievements-store'
import { checkAchievements } from '../achievements/registry'
import type { Achievement } from '../../shared/types/meta'
import { useProgressStore } from '../progress/progress-store'
import { levelFromXp } from '../progress/xp'
import { toSessionSummary } from './to-session-summary'
import { useProviderStore } from '../../shared/api/provider-store'

export interface SessionMetrics {
  /** XP earned by the session. */
  xpGained: number
  /** Achievements unlocked by the session. */
  newAchievements: Achievement[]
  /** Player level after the session's XP was awarded. */
  level: number
  /** The session beat the previous best score (never on the first session). */
  isNewRecord: boolean
}

export function useSessionMetrics(): SessionMetrics | null {
  const finishedAt = useQuizSessionStore(
    (s) => s.finishedSession?.finishedAt ?? null,
  )
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null)

  useEffect(() => {
    if (finishedAt === null) return

    const result = useQuizSessionStore.getState().finishedSession
    if (!result) return

    const statsStore = useStatsStore.getState()
    // Already folded into stats (remount / Strict Mode re-run) — bail out.
    if (statsStore.history[0]?.finishedAt === finishedAt) return

    const summary = {
      ...toSessionSummary(result),
      providerId: useProviderStore.getState().providerId,
    }

    // Order matters: achievements see the post-session stats (cumulative
    // rules like «expert» count this session too), XP uses the session.
    const isNewRecord =
      statsStore.totalSessions > 0 && summary.score > statsStore.bestScore
    const nextStats = applySessionToStats(statsStore, summary)
    statsStore.recordSession(summary)

    const achievementsStore = useAchievementsStore.getState()
    const fresh = checkAchievements(
      nextStats,
      summary,
      achievementsStore.unlocked,
    )
    if (fresh.length > 0) {
      achievementsStore.unlock(
        fresh.map((a) => a.id),
        toIsoDate(summary.finishedAt),
      )
    }

    const xpGained = useProgressStore.getState().awardSession(summary)

    setMetrics({
      xpGained,
      newAchievements: fresh,
      level: levelFromXp(useProgressStore.getState().xp),
      isNewRecord,
    })
    // finishedAt is the one-shot key; stores are read imperatively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedAt])

  return metrics
}
