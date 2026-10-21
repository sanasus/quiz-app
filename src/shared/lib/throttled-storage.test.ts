import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createThrottledStorage } from './throttled-storage'

function memoryStorage() {
  const data = new Map<string, string>()
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage
  return { storage, data }
}

describe('createThrottledStorage', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('writes the first value at once', () => {
    const { storage, data } = memoryStorage()
    const throttled = createThrottledStorage(() => storage, 1000)

    throttled.setItem('k', 'v1')

    expect(data.get('k')).toBe('v1')
  })

  it('collapses a burst into one trailing write of the latest value', () => {
    const { storage, data } = memoryStorage()
    const throttled = createThrottledStorage(() => storage, 1000)

    throttled.setItem('k', 'v1')
    throttled.setItem('k', 'v2')
    throttled.setItem('k', 'v3')
    expect(data.get('k')).toBe('v1')
    expect(storage.setItem).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)

    expect(data.get('k')).toBe('v3')
    expect(storage.setItem).toHaveBeenCalledTimes(2)
  })

  it('reads its own pending value before it is written', () => {
    const { storage } = memoryStorage()
    const throttled = createThrottledStorage(() => storage, 1000)

    throttled.setItem('k', 'v1')
    throttled.setItem('k', 'v2')

    expect(throttled.getItem('k')).toBe('v2')
  })

  it('flush writes pending data immediately', () => {
    const { storage, data } = memoryStorage()
    const throttled = createThrottledStorage(() => storage, 1000)
    throttled.setItem('k', 'v1')
    throttled.setItem('k', 'v2')

    throttled.flush()

    expect(data.get('k')).toBe('v2')
  })

  it('flushes when the page is hidden', () => {
    const { storage, data } = memoryStorage()
    const throttled = createThrottledStorage(() => storage, 1000)
    throttled.setItem('k', 'v1')
    throttled.setItem('k', 'v2')

    window.dispatchEvent(new Event('pagehide'))

    expect(data.get('k')).toBe('v2')
  })

  it('removeItem drops a pending write too', () => {
    const { storage, data } = memoryStorage()
    const throttled = createThrottledStorage(() => storage, 1000)
    throttled.setItem('k', 'v1')
    throttled.setItem('k', 'v2')

    throttled.removeItem('k')
    vi.advanceTimersByTime(2000)

    expect(data.has('k')).toBe(false)
  })

  it('survives a storage that throws', () => {
    const { storage } = memoryStorage()
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error('quota')
    })
    const throttled = createThrottledStorage(() => storage, 1000)

    expect(() => throttled.setItem('k', 'v')).not.toThrow()
  })
})
