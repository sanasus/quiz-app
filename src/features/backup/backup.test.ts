import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '../../app/settings-store'
import { useAchievementsStore } from '../achievements/achievements-store'
import { useProgressStore } from '../progress/progress-store'
import { useStatsStore } from '../stats/stats-store'
import { useCursorStore } from '../history/cursor-store'
import { closeHistoryDb, getHistory, recordAnswer } from '../history/history-db'
import {
  BackupError,
  applyBackup,
  backupFilename,
  createBackup,
  parseBackup,
} from './backup'

beforeEach(async () => {
  await closeHistoryDb()
  globalThis.indexedDB = new IDBFactory()
  useProgressStore.getState().resetProgress()
  useStatsStore.getState().resetStats()
  useAchievementsStore.getState().resetAchievements()
  useCursorStore.getState().resetCursors()
  useSettingsStore.setState({ theme: 'system', animations: true })
})

afterEach(async () => {
  await closeHistoryDb()
})

/** A backup with some progress in every store. */
async function backupWithProgress(): Promise<string> {
  useProgressStore.setState({ xp: 420 })
  useAchievementsStore.getState().unlock(['first_blood'], '2026-01-15')
  useSettingsStore.setState({ theme: 'dark', animations: false })
  useCursorStore.getState().setCursor('quizapi|all|easy', 7)
  await recordAnswer('quizapi', 'q1', 'wrong', 123)
  return JSON.stringify(await createBackup(new Date('2026-03-04T10:00:00Z')))
}

describe('createBackup', () => {
  it('records the format, a version per store and the history', async () => {
    const backup = JSON.parse(await backupWithProgress())

    expect(backup.format).toBe(1)
    expect(backup.exportedAt).toBe('2026-03-04T10:00:00.000Z')
    expect(Object.keys(backup.stores).sort()).toEqual([
      'achievements',
      'cursors',
      'progress',
      'settings',
      'stats',
    ])
    expect(backup.stores.progress).toEqual({ version: 1, state: { xp: 420 } })
    expect(backup.stores.stats.version).toBeGreaterThan(0)
    expect(backup.history).toHaveLength(1)
  })

  it('leaves the provider choice and the live session out', async () => {
    const backup = JSON.parse(await backupWithProgress())

    expect(backup.stores.provider).toBeUndefined()
    expect(backup.stores.session).toBeUndefined()
  })
})

describe('round trip', () => {
  it('restores every store and the history', async () => {
    const text = await backupWithProgress()

    // Lose everything, then restore.
    useProgressStore.getState().resetProgress()
    useAchievementsStore.getState().resetAchievements()
    useSettingsStore.setState({ theme: 'light', animations: true })
    useCursorStore.getState().resetCursors()
    await closeHistoryDb()
    globalThis.indexedDB = new IDBFactory()

    await applyBackup(parseBackup(text))

    expect(useProgressStore.getState().xp).toBe(420)
    expect(useAchievementsStore.getState().unlocked).toEqual({
      first_blood: '2026-01-15',
    })
    expect(useSettingsStore.getState()).toMatchObject({
      theme: 'dark',
      animations: false,
    })
    expect(useCursorStore.getState().cursors).toEqual({ 'quizapi|all|easy': 7 })
    expect((await getHistory('quizapi', ['q1'])).get('q1')).toEqual({
      status: 'wrong',
      lastSeen: 123,
    })
  })

  it('replaces rather than merges', async () => {
    const text = await backupWithProgress()
    useProgressStore.setState({ xp: 9000 })
    useAchievementsStore.getState().unlock(['perfectionist'], '2026-02-01')

    await applyBackup(parseBackup(text))

    expect(useProgressStore.getState().xp).toBe(420)
    expect(Object.keys(useAchievementsStore.getState().unlocked)).toEqual([
      'first_blood',
    ])
  })
})

describe('parseBackup rejects bad files without touching data', () => {
  const code = (text: string) => {
    try {
      parseBackup(text)
    } catch (error) {
      return error instanceof BackupError
        ? [error.code, error.section]
        : ['other']
    }
    return ['accepted']
  }

  it('not JSON', () => {
    expect(code('{nope')[0]).toBe('invalid_json')
  })

  it('JSON that is not a backup', () => {
    expect(code('{"hello":1}')[0]).toBe('not_a_backup')
    expect(code('[]')[0]).toBe('not_a_backup')
  })

  it('an unknown format', async () => {
    const backup = JSON.parse(await backupWithProgress())
    backup.format = 2

    expect(code(JSON.stringify(backup))[0]).toBe('unsupported_format')
  })

  it('a store from a newer app version', async () => {
    const backup = JSON.parse(await backupWithProgress())
    backup.stores.progress.version = 99

    expect(code(JSON.stringify(backup))).toEqual(['newer_version', 'progress'])
  })

  it('a store whose data breaks its schema', async () => {
    const backup = JSON.parse(await backupWithProgress())
    backup.stores.progress.state = { xp: 'lots' }

    expect(code(JSON.stringify(backup))).toEqual(['invalid_data', 'progress'])
  })

  it('statistics that cannot be upgraded', async () => {
    const backup = JSON.parse(await backupWithProgress())
    backup.stores.stats = { version: 0, state: 'garbage' }

    expect(code(JSON.stringify(backup))).toEqual(['invalid_data', 'stats'])
  })

  it('a missing required store', async () => {
    const backup = JSON.parse(await backupWithProgress())
    delete backup.stores.achievements

    expect(code(JSON.stringify(backup))).toEqual([
      'invalid_data',
      'achievements',
    ])
  })

  it('a damaged history', async () => {
    const backup = JSON.parse(await backupWithProgress())
    backup.history = [{ nope: true }]

    expect(code(JSON.stringify(backup))).toEqual(['invalid_data', 'history'])
  })

  it('accepts a backup without the optional parts', async () => {
    const backup = JSON.parse(await backupWithProgress())
    delete backup.stores.cursors
    delete backup.history

    expect(code(JSON.stringify(backup))).toEqual(['accepted'])
  })
})

describe('backupFilename', () => {
  it('uses the local date', () => {
    expect(backupFilename(new Date(2026, 2, 4, 12))).toBe(
      'quiz-app-backup-2026-03-04.json',
    )
  })
})
