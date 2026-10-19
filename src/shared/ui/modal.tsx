/**
 * Modal — backdrop + centered overlay card for dialogs. The caller owns
 * the ids (aria-labelledby / aria-describedby) and the content.
 */

import type { ReactNode } from 'react'
import { Card } from './card'

export interface ModalProps {
  labelledBy: string
  describedBy: string
  /** Test hook on the dialog root (e2e / component tests). */
  testId?: string
  /** Backdrop click / Escape. Omit for a dialog that must be answered. */
  onDismiss?: () => void
  children: ReactNode
}

export function Modal({
  labelledBy,
  describedBy,
  testId,
  onDismiss,
  children,
}: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onClick={onDismiss}
      onKeyDown={
        onDismiss
          ? (e) => {
              if (e.key === 'Escape') onDismiss()
            }
          : undefined
      }
    >
      <Card
        variant="overlay"
        padding="lg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        data-testid={testId}
        className="w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </Card>
    </div>
  )
}
