import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, isDifficulty } from './difficulties'

describe('isDifficulty', () => {
  it('accepts every supported level', () => {
    for (const level of DIFFICULTIES) {
      expect(isDifficulty(level)).toBe(true)
    }
  })

  // The API reports EXPERT in its metadata, but the internal model
  // stops at hard — an accepted 'expert' would fail the /quiz config
  // schema and silently redirect back to /setup.
  it('rejects EXPERT, which the API reports but the model lacks', () => {
    expect(isDifficulty('expert')).toBe(false)
    expect(isDifficulty('EXPERT')).toBe(false)
  })

  it('rejects other unknown values', () => {
    expect(isDifficulty('')).toBe(false)
    expect(isDifficulty('insane')).toBe(false)
  })
})
