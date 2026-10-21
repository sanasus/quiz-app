import { describe, expect, it, vi } from 'vitest'
import { shareResult, type ShareEnv } from './share-result'

const payload = {
  blob: new Blob(['png'], { type: 'image/png' }),
  text: 'Blitz · Hard · 9/10',
  filename: 'quiz-result.png',
}

function makeEnv(overrides: Partial<ShareEnv> = {}): ShareEnv {
  return { download: vi.fn(), ...overrides }
}

describe('shareResult', () => {
  it('shares the file when the browser can share files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const env = makeEnv({ share, canShare: () => true })

    expect(await shareResult(payload, env)).toBe('shared')
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ text: payload.text }),
    )
    expect(env.download).not.toHaveBeenCalled()
  })

  it('treats a dismissed share sheet as cancelled, not as a failure', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('closed', 'AbortError'))
    const writeClipboard = vi.fn()
    const env = makeEnv({
      share,
      canShare: () => true,
      writeClipboard,
      createClipboardItem: vi.fn(),
    })

    expect(await shareResult(payload, env)).toBe('cancelled')
    expect(writeClipboard).not.toHaveBeenCalled()
  })

  it('copies the image when files cannot be shared', async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined)
    const env = makeEnv({
      share: vi.fn(),
      canShare: () => false,
      writeClipboard,
      createClipboardItem: vi.fn(),
    })

    expect(await shareResult(payload, env)).toBe('copied-image')
    expect(writeClipboard).toHaveBeenCalledOnce()
  })

  it('falls through to the clipboard when sharing throws', async () => {
    const env = makeEnv({
      share: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      canShare: () => true,
      writeClipboard: vi.fn().mockResolvedValue(undefined),
      createClipboardItem: vi.fn(),
    })

    expect(await shareResult(payload, env)).toBe('copied-image')
  })

  it('downloads the PNG and copies the text as the last resort', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const env = makeEnv({
      writeClipboard: vi.fn().mockRejectedValue(new Error('denied')),
      createClipboardItem: vi.fn(),
      writeText,
    })

    expect(await shareResult(payload, env)).toBe('downloaded')
    expect(env.download).toHaveBeenCalledWith(payload.blob, payload.filename)
    expect(writeText).toHaveBeenCalledWith(payload.text)
  })

  it('still reports the download when copying the text fails', async () => {
    const env = makeEnv({
      writeText: vi.fn().mockRejectedValue(new Error('denied')),
    })

    expect(await shareResult(payload, env)).toBe('downloaded')
  })
})
