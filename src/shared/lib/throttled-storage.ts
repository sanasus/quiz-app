/**
 * A Storage wrapper that coalesces writes: the first write goes through at
 * once, later ones inside the interval collapse into a single trailing
 * write of the latest value.
 *
 * The quiz session changes every second (timer ticks) and zustand's
 * persist rewrites the whole JSON each time, which is wasteful once a
 * survival run holds hundreds of questions. Pending data is flushed when
 * the page is hidden or closed, so a reload or an evicted mobile tab still
 * sees the latest state.
 */

import type { StateStorage } from 'zustand/middleware'

export interface ThrottledStorage extends StateStorage {
  /** Write whatever is pending right now. */
  flush: () => void
}

export function createThrottledStorage(
  getBase: () => Storage,
  intervalMs: number,
): ThrottledStorage {
  const pending = new Map<string, string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastWrite = -Infinity

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    if (pending.size === 0) return
    const base = getBase()
    for (const [name, value] of pending) {
      try {
        base.setItem(name, value)
      } catch {
        // Quota or a blocked storage: persistence is best effort.
      }
    }
    pending.clear()
    lastWrite = Date.now()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    flush,
    getItem: (name) => pending.get(name) ?? getBase().getItem(name),
    setItem: (name, value) => {
      pending.set(name, value)
      if (timer !== null) return
      const wait = intervalMs - (Date.now() - lastWrite)
      if (wait <= 0) flush()
      else timer = setTimeout(flush, wait)
    },
    removeItem: (name) => {
      pending.delete(name)
      getBase().removeItem(name)
    },
  }
}
