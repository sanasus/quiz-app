/**
 * Settings section: download a backup file, restore from one.
 */

import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Upload } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { ConfirmDialog } from '../../shared/ui/confirm-dialog'
import { downloadBlob } from '../../shared/lib/download'
import {
  BackupError,
  applyBackup,
  backupFilename,
  createBackup,
  parseBackup,
  type ParsedBackup,
} from './backup'

type Notice = { kind: 'success' | 'error'; text: string }

export function BackupSection() {
  const { t, i18n } = useTranslation()
  const fileInput = useRef<HTMLInputElement>(null)
  // A validated file waiting for the player's confirmation to replace data.
  const [pending, setPending] = useState<ParsedBackup | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const handleDownload = async () => {
    const backup = await createBackup()
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      }),
      backupFilename(),
    )
    setNotice(null)
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset so choosing the same file again still fires `change`.
    event.target.value = ''
    if (!file) return

    try {
      setPending(parseBackup(await file.text()))
      setNotice(null)
    } catch (error) {
      const code = error instanceof BackupError ? error.code : 'invalid_json'
      const section = error instanceof BackupError ? error.section : undefined
      setNotice({
        kind: 'error',
        text: t(`settings.backup_error.${code}`, { section }),
      })
    }
  }

  const handleConfirm = async () => {
    const backup = pending
    setPending(null)
    if (!backup) return
    try {
      await applyBackup(backup)
      setNotice({ kind: 'success', text: t('settings.backup_restored') })
    } catch {
      setNotice({
        kind: 'error',
        text: t('settings.backup_error.invalid_data', { section: '' }),
      })
    }
  }

  const exportedOn = pending
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
        dateStyle: 'medium',
      }).format(new Date(pending.exportedAt))
    : ''

  return (
    <section className="flex flex-col gap-3" data-testid="backup-section">
      <h2 className="font-semibold text-text">{t('settings.backup')}</h2>
      <p className="text-caption text-text-2">{t('settings.backup_hint')}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" onClick={handleDownload}>
          <Download className="size-4" aria-hidden />
          {t('settings.backup_download')}
        </Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
          <Upload className="size-4" aria-hidden />
          {t('settings.backup_restore')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label={t('settings.backup_restore')}
          data-testid="backup-file"
          onChange={handleFile}
        />
      </div>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={
            notice.kind === 'error'
              ? 'text-body text-danger-ink'
              : 'text-body text-success-ink'
          }
        >
          {notice.text}
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        testId="backup-restore-confirm"
        title={t('settings.backup_confirm_title')}
        message={t('settings.backup_confirm', { date: exportedOn })}
        confirmLabel={t('settings.backup_confirm_button')}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </section>
  )
}
