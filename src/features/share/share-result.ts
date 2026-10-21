/**
 * Share chain: Web Share with the PNG → PNG to the clipboard → download
 * the PNG and copy the text line. Each step falls through to the next.
 *
 * The caller must invoke this synchronously from the click handler with
 * an already-rendered blob: Safari drops user activation across awaits,
 * so nothing here may await before `share()`.
 */

export type ShareOutcome =
  'shared' | 'copied-image' | 'downloaded' | 'cancelled'

export interface ShareEnv {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
  writeClipboard?: (items: ClipboardItem[]) => Promise<void>
  writeText?: (text: string) => Promise<void>
  createClipboardItem?: (blob: Blob) => ClipboardItem
  download: (blob: Blob, filename: string) => void
}

export interface SharePayload {
  blob: Blob
  text: string
  filename: string
}

export function browserShareEnv(): ShareEnv {
  const nav = navigator
  return {
    share: nav.share?.bind(nav),
    canShare: nav.canShare?.bind(nav),
    writeClipboard: nav.clipboard?.write?.bind(nav.clipboard),
    writeText: nav.clipboard?.writeText?.bind(nav.clipboard),
    createClipboardItem:
      typeof ClipboardItem === 'undefined'
        ? undefined
        : (blob) => new ClipboardItem({ [blob.type]: blob }),
    download: (blob, filename) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
  }
}

export async function shareResult(
  { blob, text, filename }: SharePayload,
  env: ShareEnv = browserShareEnv(),
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: blob.type })
  const data: ShareData = { files: [file], text }

  if (env.share && env.canShare?.(data)) {
    try {
      await env.share(data)
      return 'shared'
    } catch (error) {
      // The user closed the share sheet — that is an answer, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }

  if (env.writeClipboard && env.createClipboardItem) {
    try {
      await env.writeClipboard([env.createClipboardItem(blob)])
      return 'copied-image'
    } catch {
      // Permission denied / unsupported type — fall through to download.
    }
  }

  env.download(blob, filename)
  try {
    await env.writeText?.(text)
  } catch {
    // The file is already saved; the text line is a bonus.
  }
  return 'downloaded'
}
