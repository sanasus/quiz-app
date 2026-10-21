/** The product events we send. No personal data in any of them. */

import type { ErrorKind } from '../api/errors'

export type SwitchReason =
  'settings' | 'error_dialog' | 'auto_setup' | 'degraded_retry'

export interface RunProps {
  mode: string
  difficulty: string
  category: string
  provider: string
}

export interface AnalyticsEvents {
  quiz_started: RunProps & { repeats: boolean }
  quiz_finished: RunProps & {
    /** The player left before the run ended. */
    abandoned: boolean
    correct: number
    total: number
    score: number
  }
  provider_switched: {
    from: string
    to: string
    reason: SwitchReason
    /** The error kind behind a forced switch (error dialog, auto-switch). */
    kind?: ErrorKind
  }
  share_clicked: { outcome: string }
  question_reported: { provider: string }
}
