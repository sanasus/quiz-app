import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for mock data to load
    await page.waitForTimeout(1200)
  })

  test('renders welcome heading and start button', async ({ page }) => {
    // Check heading is visible (includes emoji prefix)
    await expect(
      page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
    ).toBeVisible()

    // Check start button is visible and links to /setup
    const startBtn = page.getByRole('link', { name: 'Start Quiz' })
    await expect(startBtn).toBeVisible()
    await expect(startBtn).toHaveAttribute('href', '/setup')
  })

  test('toggles language between EN and RU', async ({ page }) => {
    // Initial language is EN (browser detection or fallback)
    const startBtn = page.getByRole('link', { name: 'Start Quiz' })
    await expect(startBtn).toBeVisible()

    // Click the language toggle button (aria-label="Toggle language", shows "EN"/"RU")
    // Get the button's bounding box and click with page.mouse to bypass visibility checks
    const langBtn = page.locator('button[aria-label="Toggle language"]').first()
    const box = await langBtn.boundingBox()
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    }

    // After toggle, text should be in Russian
    await expect(
      page.getByRole('link', { name: 'Начать тест' }),
    ).toBeVisible()

    // Toggle back
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect(
      page.getByRole('link', { name: 'Start Quiz' }),
    ).toBeVisible()
  })
})
