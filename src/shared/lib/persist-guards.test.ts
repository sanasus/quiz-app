import { describe, expect, it, vi } from 'vitest'
import { assertMigrationsMatchVersion } from './persist-guards'
import { useAchievementsStore } from '../../features/achievements/achievements-store'
import { useProgressStore } from '../../features/progress/progress-store'
import { useSettingsStore } from '../../app/settings-store'
import { useProviderStore } from '../api/provider-store'
import { useStatsStore } from '../../features/stats/stats-store'

describe('assertMigrationsMatchVersion', () => {
  it('passes when the version equals the migration count', () => {
    expect(() => assertMigrationsMatchVersion('demo', 2, 2)).not.toThrow()
  })

  it('logs to the console and throws on a mismatch', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const message =
      'Store "demo": version (3) does not match the number of migrations (2)'
    expect(() => assertMigrationsMatchVersion('demo', 3, 2)).toThrow(message)
    expect(spy).toHaveBeenCalledWith(message)
    spy.mockRestore()
  })
})

describe('persisted stores keep version and migrations in sync', () => {
  const stores = {
    achievements: useAchievementsStore,
    progress: useProgressStore,
    settings: useSettingsStore,
    provider: useProviderStore,
    stats: useStatsStore,
  }

  it.each(Object.entries(stores))('%s: migrate does not throw', (_, store) => {
    const migrate = store.persist.getOptions().migrate
    expect(migrate).toBeTypeOf('function')
    expect(() => migrate?.({}, 0)).not.toThrow()
  })
})
