import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  resolveTheme,
  settingsSchema,
} from './settings-store'

describe('resolveTheme', () => {
  it('keeps an explicit light theme', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('light', false)).toBe('light')
  })

  it('keeps an explicit dark theme', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows the OS preference for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('settingsSchema', () => {
  it('accepts valid settings', () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true)
    expect(
      settingsSchema.safeParse({ theme: 'dark', animations: false }).success,
    ).toBe(true)
  })

  it('rejects corrupt persisted data', () => {
    expect(settingsSchema.safeParse({ theme: 'neon' }).success).toBe(false)
    expect(
      settingsSchema.safeParse({ theme: 'light', animations: 'yes' }).success,
    ).toBe(false)
    expect(settingsSchema.safeParse(null).success).toBe(false)
  })
})
