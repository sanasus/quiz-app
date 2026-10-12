import { test, expect } from '@playwright/test'
import { goToSetup } from './fixtures'

test.describe('Setup page', () => {
  test.beforeEach(async ({ page }) => {
    await goToSetup(page)
  })

  test(
    'renders setup title and all configuration sections',
    { tag: ['@smoke'] },
    async ({ page }) => {
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
    },
  )

  test('shows category dropdown with topics and categories', async ({
    page,
  }) => {
    const dropdown = page.getByTestId('category-dropdown')
    await expect(dropdown).toBeVisible()
    // Collapsed trigger shows "All" (from t('common.category_all'))
    await expect(dropdown).toContainText('All')

    // Open — topics render as accordion buttons inside the panel
    await dropdown.click()
    await expect(page.getByRole('button', { name: 'Science' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'History' })).toBeVisible()
  })

  test('selects a category from dropdown', async ({ page }) => {
    const dropdown = page.getByTestId('category-dropdown')
    await dropdown.click()

    // Expand the Science topic
    const scienceTopic = page.getByRole('button', { name: 'Science' })
    await expect(scienceTopic).toBeVisible()
    await scienceTopic.click()

    // Pick a category
    const physicsCategory = page.getByRole('button', { name: 'Physics' })
    await expect(physicsCategory).toBeVisible()
    await physicsCategory.click()

    // Panel closes (topic buttons unmount) and the trigger shows the
    // selected category
    await expect(page.getByRole('button', { name: 'Science' })).not.toBeVisible()
    await expect(dropdown).toContainText('Physics')
  })

  test('selects difficulty levels', async ({ page }) => {
    const easyBtn = page.getByTestId('difficulty-easy')
    const mediumBtn = page.getByTestId('difficulty-medium')
    const hardBtn = page.getByTestId('difficulty-hard')

    // Easy is the default
    await expect(easyBtn).toBeVisible()
    await expect(easyBtn).toHaveAttribute('aria-pressed', 'true')

    await mediumBtn.click()
    await expect(mediumBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(easyBtn).toHaveAttribute('aria-pressed', 'false')

    await hardBtn.click()
    await expect(hardBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(mediumBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test('question count slider is visible', async ({ page }) => {
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible()
    await expect(slider).toHaveValue('2')

    // The count display mirrors the slider value
    await expect(page.getByTestId('question-count-value')).toHaveText('2')
  })

  test('mode selector shows all game modes', async ({ page }) => {
    await expect(page.getByText('Classic')).toBeVisible()
    await expect(page.getByText('Timed')).toBeVisible()
    await expect(page.getByText('Blitz')).toBeVisible()
    await expect(page.getByText('Survival')).toBeVisible()
  })

  test('selecting a mode updates selection', async ({ page }) => {
    const classicBtn = page.getByTestId('mode-classic')
    const timedBtn = page.getByTestId('mode-timed')
    const survivalBtn = page.getByTestId('mode-survival')

    // Classic is the default
    await expect(classicBtn).toHaveAttribute('aria-pressed', 'true')

    await timedBtn.click()
    await expect(timedBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(classicBtn).toHaveAttribute('aria-pressed', 'false')

    await survivalBtn.click()
    await expect(survivalBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(timedBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test(
    'clicking Start navigates to /quiz',
    { tag: ['@smoke'] },
    async ({ page }) => {
      await page.getByRole('button', { name: 'Start' }).click()

      // Should navigate to /quiz and show the first question
      await expect(page).toHaveURL(/\/quiz/)
      await expect(
        page.getByRole('heading', { name: 'Question' }),
      ).toBeVisible()
    },
  )
})
