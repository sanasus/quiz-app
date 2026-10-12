import { test, expect } from '@playwright/test'
import { goToSetup } from './fixtures'

test.describe('Setup page', () => {
  test.beforeEach(async ({ page }) => {
    await goToSetup(page)
  })

  test('renders setup title and all configuration sections', async ({
    page,
  }) => {
    // Title
    await expect(
      page.getByRole('heading', { name: 'Quiz Settings' }),
    ).toBeVisible()

    // All section labels
    await expect(page.getByText('Category')).toBeVisible()
    await expect(page.getByText('Difficulty')).toBeVisible()
    await expect(page.getByText('Number of Questions')).toBeVisible()
    await expect(page.getByText('Mode')).toBeVisible()

    // Start button
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  })

  test('shows category dropdown with topics and categories', async ({
    page,
  }) => {
    // The dropdown trigger shows "All" (from t('common.category_all'))
    const dropdown = page.getByRole('button', { name: 'All' })
    await expect(dropdown).toBeVisible()

    // Click to open
    await dropdown.click()
    // Wait for dropdown to be interactive
    await expect(page.getByText('Science')).toBeVisible()

    // Topics should be visible as expandable buttons
    await expect(page.getByText('Science')).toBeVisible()
    await expect(page.getByText('History')).toBeVisible()
  })

  test('selects a category from dropdown', async ({ page }) => {
    // Use button name instead of DOM traversal — more stable than locator('..')
    const dropdown = page.getByRole('button', { name: 'All' })
    await expect(dropdown).toBeVisible()

    await dropdown.click()
    // Wait for dropdown to open
    await expect(page.getByText('Science')).toBeVisible()

    // Expand Science topic
    await page.getByText('Science').click()
    // Wait for categories to appear
    await expect(page.getByRole('button', { name: 'Physics' })).toBeVisible()

    // Click a category
    await page.getByRole('button', { name: 'Physics' }).click()

    // Verify the dropdown closed (panel should be gone)
    await expect(page.getByText('Science')).not.toBeVisible()
  })

  test('selects difficulty levels', async ({ page }) => {
    // Easy is default
    const easyBtn = page.getByRole('button', { name: 'Easy' })
    await expect(easyBtn).toBeVisible()

    // Click Medium
    const mediumBtn = page.getByRole('button', { name: 'Medium' })
    await mediumBtn.click()

    // Click Hard
    const hardBtn = page.getByRole('button', { name: 'Hard' })
    await hardBtn.click()
  })

  test('question count slider is visible', async ({ page }) => {
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible()

    // Check the count display
    const countDisplay = page.getByText('2')
    await expect(countDisplay).toBeVisible()
  })

  test('mode selector shows all game modes', async ({ page }) => {
    await expect(page.getByText('Classic')).toBeVisible()
    await expect(page.getByText('Timed')).toBeVisible()
    await expect(page.getByText('Blitz')).toBeVisible()
    await expect(page.getByText('Survival')).toBeVisible()
  })

  test('selecting a mode updates selection', async ({ page }) => {
    // Click Timed mode
    const timedBtn = page.getByRole('button', { name: 'Timed' })
    await timedBtn.click()

    // Click Survival mode
    const survivalBtn = page.getByRole('button', { name: 'Survival' })
    await survivalBtn.click()
  })

  test('clicking Start navigates to /quiz', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: 'Start' })
    await startBtn.click()

    // Should navigate to /quiz and show first question
    await page.waitForURL('/quiz**')
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()
  })
})
