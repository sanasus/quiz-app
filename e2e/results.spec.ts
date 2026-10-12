import { test, expect } from '@playwright/test'
import { startQuiz, waitForResults } from './fixtures'

test.describe('Results screen', () => {
  test.beforeEach(async ({ page }) => {
    // Reset locale to English (previous tests may have changed it)
    await page.evaluate(() => {
      // @ts-expect-error i18n is available on window
      window.i18n?.changeLanguage('en')
    })

    // Use hard difficulty and answer incorrectly to guarantee mistakes exist
    await startQuiz(page, { difficulty: 'hard', questionCount: 2 })

    const options = page.locator('[data-testid^="option-"]')
    await expect(options.first()).toBeVisible()
    // Answer first option (mock hard questions have second option correct)
    await options.nth(0).click()
    await page.getByRole('button', { name: 'Submit' }).click()
    await page.getByRole('button', { name: 'Next' }).click()

    await expect(options.first()).toBeVisible()
    await options.nth(0).click()
    await page.getByRole('button', { name: 'Submit' }).click()

    // Wait for results
    await waitForResults(page)
  })

  test('displays score card', async ({ page }) => {
    // Score card should be visible with a large number
    await expect(page.getByText('Score')).toBeVisible()
  })

  test('displays correct and incorrect counts', async ({ page }) => {
    await expect(page.getByText('Correct', { exact: true })).toBeVisible()
    await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
  })

  test('displays accuracy percentage', async ({ page }) => {
    await expect(page.getByText('Accuracy')).toBeVisible()
  })

  test('displays time spent', async ({ page }) => {
    await expect(page.getByText('Time spent')).toBeVisible()
  })

  test('shows mistakes list when there are mistakes', async ({ page }) => {
    // Mistakes section should now be visible (guaranteed by beforeEach)
    const mistakesTitle = page.getByRole('heading', { name: 'Mistakes' })
    await expect(mistakesTitle).toBeVisible()
    await expect(page.getByText('❌ O(n)')).toBeVisible()
    await expect(page.getByText('✅ O(log n)')).toBeVisible()
  })

  test('new quiz button navigates to setup', async ({ page }) => {
    const newQuizBtn = page.getByRole('button', { name: 'New Quiz' })
    await expect(newQuizBtn).toBeVisible()
    await newQuizBtn.click()

    await page.waitForURL('/setup')
    await expect(
      page.getByRole('heading', { name: 'Quiz Settings' }),
    ).toBeVisible()
  })

  test('repeat mistakes button navigates to quiz', async ({ page }) => {
    // Repeat mistakes button should now be visible (guaranteed by beforeEach)
    const repeatBtn = page.getByRole('button', { name: 'Repeat mistakes' })
    await expect(repeatBtn).toBeVisible()
    await repeatBtn.click()
    await page.waitForURL('/quiz**')
    await expect(
      page.getByRole('heading', { name: 'Question' }),
    ).toBeVisible()
  })
})
