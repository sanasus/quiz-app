/**
 * Backup file: export and import of everything the player has earned.
 *
 * XP, statistics, achievements and settings live only in this browser's
 * localStorage (plus the question history in IndexedDB), so a file the
 * player keeps is the only protection against cleared site data or a new
 * device. There are no accounts.
 *
 * Format: `{ format: 1, exportedAt, stores: { <name>: { version, state } },
 * history? }`. Every store carries its own `version`; on import each state
 * goes through that store's migrations and its Zod schema, so a broken or
 * foreign file is rejected before anything is touched. Import REPLACES
 * (merging statistics is ambiguous). `provider-store` and the live quiz
 * session are deliberately not part of a backup.
 */

import { z } from 'zod'
import { useSettingsStore, settingsSchema } from '../../app/settings-store'
import {
  useAchievementsStore,
  achievementsDataSchema,
} from '../achievements/achievements-store'
import {
  useProgressStore,
  progressDataSchema,
} from '../progress/progress-store'
import { useStatsStore } from '../stats/stats-store'
import { statsDataSchema, upgradePersistedStats } from '../stats/stats-schema'
import { toIsoDate } from '../stats/stats-logic'
import { cursorDataSchema, useCursorStore } from '../history/cursor-store'
import {
  exportHistory,
  replaceHistory,
  type HistoryRecord,
} from '../history/history-db'

export const BACKUP_FORMAT = 1

export type BackupErrorCode =
  | 'invalid_json'
  | 'not_a_backup'
  | 'unsupported_format'
  | 'newer_version'
  | 'invalid_data'

export class BackupError extends Error {
  readonly code: BackupErrorCode
  /** The store (or section) the problem was found in, when there is one. */
  readonly section?: string

  constructor(code: BackupErrorCode, section?: string) {
    super(section ? `${code}: ${section}` : code)
    this.name = 'BackupError'
    this.code = code
    this.section = section
  }
}

/** The shape of the zustand `persist` API the adapters rely on. */
interface PersistedStore<TData> {
  persist: {
    getOptions: () => {
      version?: number
      migrate?: (state: unknown, version: number) => unknown
    }
  }
  getState: () => unknown
  setState: (data: TData) => void
}

interface StoreAdapter {
  schema: z.ZodType<unknown>
  version: number
  /** Current data as persisted (no actions). */
  read: () => unknown
  /** Upgrade an old payload; null when it cannot be upgraded. */
  upgrade: (state: unknown, version: number) => unknown | null
  write: (data: unknown) => void
  /** Required in every backup; optional stores are skipped when absent. */
  required: boolean
}

function adapter<TData>(
  store: PersistedStore<TData>,
  schema: z.ZodType<TData>,
  required: boolean,
  upgrade?: StoreAdapter['upgrade'],
): StoreAdapter {
  const options = store.persist.getOptions()
  const partialize = (options as { partialize?: (state: unknown) => unknown })
    .partialize
  return {
    schema,
    version: options.version ?? 0,
    required,
    read: () => (partialize ? partialize(store.getState()) : store.getState()),
    upgrade:
      upgrade ??
      ((state, version) => options.migrate?.(state, version) ?? state),
    write: (data) => store.setState(data as TData),
  }
}

/** Built lazily so the adapters read the stores after they are created. */
function adapters(): Record<string, StoreAdapter> {
  return {
    stats: adapter(
      useStatsStore as unknown as PersistedStore<unknown>,
      statsDataSchema,
      true,
      upgradePersistedStats,
    ),
    progress: adapter(
      useProgressStore as unknown as PersistedStore<unknown>,
      progressDataSchema,
      true,
    ),
    achievements: adapter(
      useAchievementsStore as unknown as PersistedStore<unknown>,
      achievementsDataSchema,
      true,
    ),
    settings: adapter(
      useSettingsStore as unknown as PersistedStore<unknown>,
      settingsSchema,
      true,
    ),
    cursors: adapter(
      useCursorStore as unknown as PersistedStore<unknown>,
      cursorDataSchema,
      false,
    ),
  }
}

const historyRecordSchema = z.object({
  key: z.string(),
  providerId: z.string(),
  questionId: z.string(),
  status: z.enum(['correct', 'wrong', 'reported']),
  lastSeen: z.number(),
})

const envelopeSchema = z.object({
  format: z.number(),
  exportedAt: z.string(),
  stores: z.record(
    z.string(),
    z.object({ version: z.number().int().nonnegative(), state: z.unknown() }),
  ),
  history: z.array(z.unknown()).optional(),
})

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  exportedAt: string
  stores: Record<string, { version: number; state: unknown }>
  history?: HistoryRecord[]
}

export async function createBackup(now = new Date()): Promise<BackupFile> {
  const stores: BackupFile['stores'] = {}
  for (const [name, a] of Object.entries(adapters())) {
    stores[name] = { version: a.version, state: a.read() }
  }
  return {
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    stores,
    history: await exportHistory(),
  }
}

/** `quiz-app-backup-YYYY-MM-DD.json` (local date). */
export function backupFilename(now = new Date()): string {
  return `quiz-app-backup-${toIsoDate(now.getTime())}.json`
}

export interface ParsedBackup {
  exportedAt: string
  /** Validated, migrated store data, ready to write. */
  stores: Record<string, unknown>
  history?: HistoryRecord[]
}

/**
 * Validate a backup file's text without touching any data. Throws a
 * BackupError describing the first problem found.
 */
export function parseBackup(text: string): ParsedBackup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError('invalid_json')
  }

  const envelope = envelopeSchema.safeParse(json)
  if (!envelope.success) throw new BackupError('not_a_backup')
  if (envelope.data.format !== BACKUP_FORMAT) {
    throw new BackupError('unsupported_format')
  }

  const known = adapters()
  const stores: Record<string, unknown> = {}

  for (const [name, a] of Object.entries(known)) {
    const entry = envelope.data.stores[name]
    if (!entry) {
      if (a.required) throw new BackupError('invalid_data', name)
      continue
    }
    // A file from a newer app version may hold fields we cannot read.
    if (entry.version > a.version) throw new BackupError('newer_version', name)

    const upgraded = a.upgrade(entry.state, entry.version)
    const parsed = a.schema.safeParse(upgraded)
    if (upgraded === null || !parsed.success) {
      throw new BackupError('invalid_data', name)
    }
    stores[name] = parsed.data
  }

  let history: HistoryRecord[] | undefined
  if (envelope.data.history !== undefined) {
    const parsed = z.array(historyRecordSchema).safeParse(envelope.data.history)
    if (!parsed.success) throw new BackupError('invalid_data', 'history')
    history = parsed.data
  }

  return { exportedAt: envelope.data.exportedAt, stores, history }
}

/** Replace the current data with a validated backup. */
export async function applyBackup(backup: ParsedBackup): Promise<void> {
  const known = adapters()
  for (const [name, data] of Object.entries(backup.stores)) {
    known[name]?.write(data)
  }
  if (backup.history) await replaceHistory(backup.history)
}
