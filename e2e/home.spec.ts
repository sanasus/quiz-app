import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for page to be fully loaded
    await expect(
      page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
    ).toBeVisible()
  })

  test(
    'renders welcome heading and start button',
    { tag: ['@smoke'] },
    async ({ page }) => {
      // Check heading is visible (includes emoji prefix)
      await expect(
        page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
      ).toBeVisible()

      // Check start button is visible and links to /setup
      const startBtn = page.getByRole('link', { name: 'Start Quiz' })
      await expect(startBtn).toBeVisible()
      await expect(startBtn).toHaveAttribute('href', '/setup')
    },
  )

  test(
    'toggles language between EN and RU',
    { tag: ['@i18n'] },
    async ({ page }) => {
      // The language toggle is always visible in the header
      const langBtn = page.getByTestId('lang-toggle')
      await expect(langBtn).toBeVisible()

      // Initial language is EN (browser detection or fallback)
      await expect(page.getByRole('link', { name: 'Start Quiz' })).toBeVisible()

      // Click to switch to Russian
      await langBtn.click()

      // After toggle, text should be in Russian
      await expect(
        page.getByRole('link', { name: 'Начать тест' }),
      ).toBeVisible()

      // Toggle back to English
      await langBtn.click()
      await expect(page.getByRole('link', { name: 'Start Quiz' })).toBeVisible()
    },
  )
})
