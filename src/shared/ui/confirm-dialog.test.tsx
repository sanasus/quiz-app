/**
 * ConfirmDialog (T8): the optional testId prop lands on the
 * alertdialog root — nothing changes when it is omitted.
 */

import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../app/i18n'
import { ConfirmDialog } from './confirm-dialog'

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

function renderDialog(testId?: string) {
  render(
    <I18nextProvider i18n={i18n}>
      <ConfirmDialog
        open
        title="Delete?"
        message="This cannot be undone."
        testId={testId}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    </I18nextProvider>,
  )
}

describe('ConfirmDialog', () => {
  it('puts testId on the alertdialog root when provided', () => {
    renderDialog('provider-switch-confirm')

    expect(screen.getByRole('alertdialog')).toHaveAttribute(
      'data-testid',
      'provider-switch-confirm',
    )
  })

  it('renders without a testid attribute by default', () => {
    renderDialog()

    expect(screen.getByRole('alertdialog')).not.toHaveAttribute('data-testid')
  })
})
