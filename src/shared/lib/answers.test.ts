import { describe, expect, it } from 'vitest'
import { checkAnswer } from './answers'

describe('checkAnswer', () => {
  it('accepts exactly the correct set, in any order', () => {
    expect(checkAnswer(['a'], ['a'])).toBe(true)
    expect(checkAnswer(['a', 'b'], ['b', 'a'])).toBe(true)
  })

  it('rejects a wrong, partial, extra or empty selection', () => {
    expect(checkAnswer(['a'], ['b'])).toBe(false)
    expect(checkAnswer(['a', 'b'], ['a'])).toBe(false)
    expect(checkAnswer(['a'], ['a', 'b'])).toBe(false)
    expect(checkAnswer(['a'], [])).toBe(false)
  })
})
