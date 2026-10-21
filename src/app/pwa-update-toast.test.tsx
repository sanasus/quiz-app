import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { PwaUpdateToast } from './pwa-update-toast'

const sw = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, sw.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: sw.updateServiceWorker,
  }),
}))

function renderToast() {
  return render(
    <I18nextProvider i18n={i18n}>
      <PwaUpdateToast />
    </I18nextProvider>,
  )
}

describe('PwaUpdateToast', () => {
  beforeEach(() => {
    sw.needRefresh = false
    sw.setNeedRefresh.mockClear()
    sw.updateServiceWorker.mockClear()
    void i18n.changeLanguage('en')
  })

  it('stays hidden while there is no update', () => {
    renderToast()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('reloads into the new version only when the player agrees', async () => {
    sw.needRefresh = true
    renderToast()

    expect(screen.getByText('A new version is available')).toBeTruthy()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Update' }))
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('"Later" dismisses the prompt without updating', async () => {
    sw.needRefresh = true
    renderToast()

    await userEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(sw.setNeedRefresh).toHaveBeenCalledWith(false)
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
  })
})
