import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for page to be ready
    await expect(
      page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
    ).toBeVisible()
  })

  test('desktop navigation links work', async ({ page }) => {
    // Home
    await page.getByRole('link', { name: '🏠 Home' }).click()
    await expect(
      page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
    ).toBeVisible()

    // Setup (use name to disambiguate)
    await page.getByRole('link', { name: '⚙️ Setup' }).click()
    await expect(
      page.getByRole('heading', { name: 'Quiz Settings' }),
    ).toBeVisible()

    // Stats
    await page.getByRole('link', { name: '📊 Statistics' }).click()
    await expect(
      page.getByRole('heading', { name: '📊 Stats' }),
    ).toBeVisible()

    // Achievements
    await page.getByRole('link', { name: '🏅 Achievements' }).click()
    await expect(
      page.getByRole('heading', { name: '🏅 Achievements' }),
    ).toBeVisible()

    // Settings
    await page.getByRole('link', { name: '⚙️ Settings' }).click()
    await expect(
      page.getByRole('heading', { name: '⚙️ Settings' }),
    ).toBeVisible()
  })

  test('mobile bottom navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Click setup link in bottom nav (scoped to bottom nav)
    const bottomNav = page.getByTestId('mobile-bottom-nav')
    await bottomNav.getByRole('link', { name: '⚙️' }).first().click()
    await page.waitForURL('/setup')
  })
})
