/**
 * Confirm dialog — small accessible modal for destructive actions.
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './button'
import { Modal } from './modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Optional test hook on the dialog root (e2e / component tests). */
  testId?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  testId,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Move focus to the safest action when the dialog opens.
  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <Modal
      labelledBy="confirm-dialog-title"
      describedBy="confirm-dialog-message"
      testId={testId}
      onDismiss={onCancel}
    >
      <h2
        id="confirm-dialog-title"
        className="mb-2 text-lg font-bold text-text"
      >
        {title}
      </h2>
      <p id="confirm-dialog-message" className="mb-6 text-body text-text-2">
        {message}
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button ref={confirmRef} variant="danger" size="sm" onClick={onConfirm}>
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Modal>
  )
}
