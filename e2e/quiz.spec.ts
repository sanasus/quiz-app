import { test, expect } from '@playwright/test'
import { startQuiz, answerQuestion, answerFirstOption } from './fixtures'

test.describe('Quiz screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate through setup to quiz
    await startQuiz(page)
  })

  test('displays first question with options', async ({ page }) => {
    // Question heading visible
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

    // Progress shows "1 of 2"
    await expect(page.getByText('1 of 2')).toBeVisible()

    // Options visible — find the quiz container by its test ID
    const quizContainer = page.getByTestId('quiz-screen')
    const options = quizContainer.getByRole('button')
    await expect(options).toHaveCount(6) // 4 options + Skip + Submit
  })

  test('selecting an option highlights it', async ({ page }) => {
    // Find the quiz container by its test ID
    const quizContainer = page.getByTestId('quiz-screen')
    const options = quizContainer.getByRole('button')
    await expect(options.first()).toBeVisible()
    await options.first().click()

    // Selected option should have selected state (bg-primary/10 border-primary)
    await expect(options.first()).toHaveClass(/bg-primary\/10/)
  })

  test('submitting an answer shows explanation and next button', async ({
    page,
  }) => {
    // Click first option — use the quiz container test ID
    const quizContainer = page.getByTestId('quiz-screen')
    const options = quizContainer.getByRole('button')
    await expect(options.first()).toBeVisible()
    await options.first().click()

    // Submit button should appear
    const submitBtn = page.getByRole('button', { name: 'Submit' })
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // Next button should appear after submit
    const nextBtn = page.getByRole('button', { name: 'Next' })
    await expect(nextBtn).toBeVisible()
  })

  test('skipping a question advances to next', async ({ page }) => {
    const skipBtn = page.getByRole('button', { name: 'Skip' })
    await skipBtn.click()

    // Next button should appear
    await expect(
      page.getByRole('button', { name: 'Next' }),
    ).toBeVisible()
  })

  test('completing all questions navigates to results', async ({ page }) => {
    // Answer first question using generic selector
    await answerFirstOption(page)

    // Answer second question using generic selector
    await answerFirstOption(page)

    // Should navigate to results
    await page.waitForURL('/results**')
    await expect(
      page.getByRole('heading', { name: 'Results' }),
    ).toBeVisible()
  })

  test('shows score and streak in header', async ({ page }) => {
    // Score should be visible
    await expect(page.getByText(/Score:/)).toBeVisible()

    // Streak should be visible
    await expect(page.getByText('Streak')).toBeVisible()
  })

  test('timed mode shows timer', async ({ page }) => {
    // Go back to setup
    await page.goto('/setup')
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()

    // Select Timed mode
    await page.getByRole('button', { name: 'Timed' }).click()
    await page.getByRole('button', { name: 'Start' }).click()
    await page.waitForURL('/quiz**')

    // Wait for question to appear
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

    // Timer shows a number followed by 's' — scope to quiz header area
    const quizHeader = page.locator('div').filter({ hasText: /^Question/ })
    const timerText = quizHeader.getByText(/\ds/)
    await expect(timerText).toBeVisible()
  })

  test('survival mode shows lives', async ({ page }) => {
    // Go back to setup
    await page.goto('/setup')
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()

    // Select Survival mode
    await page.getByRole('button', { name: 'Survival' }).click()
    await page.getByRole('button', { name: 'Start' }).click()
    await page.waitForURL('/quiz**')

    // Wait for question to appear
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

    // Lives show as heart emoji (❤️)
    await expect(page.getByText('❤️')).toBeVisible()
  })
})
