import { test, expect, type Page } from '@playwright/test'
import { completeQuiz, startQuiz, waitForResults } from './fixtures'

async function playOneQuiz(page: Page) {
  await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
  await completeQuiz(page, 2)
  await waitForResults(page)
}

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByTestId('settings-screen')).toBeVisible()
  })

  test('the theme choice applies at once and survives a reload', async ({
    page,
  }) => {
    const theme = page.getByTestId('theme-selector')
    const html = page.locator('html')

    await theme.getByRole('radio', { name: 'Dark' }).click()
    await expect(html).toHaveAttribute('data-theme', 'dark')

    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(theme.getByRole('radio', { name: 'Dark' })).toBeChecked()

    await theme.getByRole('radio', { name: 'Light' }).click()
    await expect(html).toHaveAttribute('data-theme', 'light')
  })

  test('the language switches the interface and survives a reload', async ({
    page,
  }) => {
    await page
      .getByTestId('language-selector')
      .getByRole('radio', { name: 'Русский' })
      .click()
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
  })

  test('turning animations off is remembered', async ({ page }) => {
    const toggle = page.getByTestId('animations-toggle')
    const html = page.locator('html')
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await expect(html).toHaveAttribute('data-motion', 'off')

    await page.reload()
    await expect(page.getByTestId('animations-toggle')).toHaveAttribute(
      'aria-checked',
      'false',
    )
    await expect(html).toHaveAttribute('data-motion', 'off')
  })
})

test.describe('Statistics', () => {
  test('starts empty and fills after a quiz', async ({ page }) => {
    await page.goto('/stats')
    await expect(page.getByText('No data yet')).toBeVisible()

    await playOneQuiz(page)
    await page.getByRole('link', { name: 'Statistics' }).click()

    await expect(page.getByTestId('stats-sessions')).toHaveText('1')
  })

  test('reset needs a confirmation and wipes statistics, XP and achievements', async ({
    page,
  }) => {
    await playOneQuiz(page)
    await page.getByRole('link', { name: 'Statistics' }).click()
    await expect(page.getByTestId('stats-sessions')).toHaveText('1')

    // Cancel keeps everything.
    await page.getByRole('button', { name: 'Reset Statistics' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByTestId('stats-sessions')).toHaveText('1')

    // Confirm wipes it.
    await page.getByRole('button', { name: 'Reset Statistics' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByText('No data yet')).toBeVisible()

    await page.getByRole('link', { name: 'Achievements' }).click()
    await expect(page.getByTestId('achievement-first_blood')).toHaveAttribute(
      'data-unlocked',
      'false',
    )
  })
})

test.describe('Achievements', () => {
  test('everything starts locked', async ({ page }) => {
    await page.goto('/achievements')

    const locked = page.locator('[data-unlocked="false"]')
    await expect(locked.first()).toBeVisible()
    await expect(page.locator('[data-unlocked="true"]')).toHaveCount(0)
    await expect(page.getByText(/^0 of \d+$/)).toBeVisible()
  })

  test('the first finished quiz unlocks First Blood', async ({ page }) => {
    await playOneQuiz(page)

    // The unlock toast on the results screen…
    await expect(page.getByText('New achievement!')).toBeVisible()
    await expect(page.getByText('First Blood').first()).toBeVisible()

    // …and the card on the achievements page.
    await page.getByRole('link', { name: 'Achievements' }).click()
    const card = page.getByTestId('achievement-first_blood')
    await expect(card).toHaveAttribute('data-unlocked', 'true')
    await expect(page.getByText(/^1 of \d+$/)).toBeVisible()
  })
})
