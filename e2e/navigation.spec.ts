import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for page to be ready
    await expect(
      page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
    ).toBeVisible()
  })

  test(
    'desktop navigation links work',
    { tag: ['@smoke'] },
    async ({ page }) => {
      // Home
      await page.getByRole('link', { name: '🏠 Home' }).click()
      await expect(page).toHaveURL((url) => url.pathname === '/')
      await expect(
        page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
      ).toBeVisible()

      // New Quiz — the /setup entry point
      await page.getByRole('link', { name: 'New Quiz' }).click()
      await expect(page).toHaveURL(/\/setup/)
      await expect(
        page.getByRole('heading', { name: 'Quiz Settings' }),
      ).toBeVisible()

      // Stats
      await page.getByRole('link', { name: '📊 Statistics' }).click()
      await expect(page).toHaveURL(/\/stats/)
      await expect(
        page.getByRole('heading', { name: '📊 Stats' }),
      ).toBeVisible()

      // Achievements
      await page.getByRole('link', { name: '🏅 Achievements' }).click()
      await expect(page).toHaveURL(/\/achievements/)
      await expect(
        page.getByRole('heading', { name: '🏅 Achievements' }),
      ).toBeVisible()

      // Settings
      await page.getByRole('link', { name: '⚙️ Settings' }).click()
      await expect(page).toHaveURL(/\/settings/)
      await expect(
        page.getByRole('heading', { name: '⚙️ Settings' }),
      ).toBeVisible()
    },
  )

  test(
    'mobile bottom navigation works',
    { tag: ['@mobile'] },
    async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Verify desktop nav is hidden on mobile
      await expect(page.getByTestId('desktop-nav')).not.toBeVisible()

      // Mobile nav is visible; links are labeled with route names
      const bottomNav = page.getByTestId('mobile-bottom-nav')
      await expect(bottomNav).toBeVisible()

      await bottomNav.getByRole('link', { name: 'New Quiz' }).click()
      await expect(page).toHaveURL(/\/setup/)
      await expect(
        page.getByRole('heading', { name: 'Quiz Settings' }),
      ).toBeVisible()

      await bottomNav.getByRole('link', { name: 'Home' }).click()
      await expect(page).toHaveURL((url) => url.pathname === '/')
      await expect(
        page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
      ).toBeVisible()
    },
  )
})
