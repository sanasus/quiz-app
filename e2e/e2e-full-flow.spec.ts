import { test, expect } from '@playwright/test'
import { completeQuiz, startNewQuiz, waitForResults } from './fixtures'

/**
 * Full end-to-end flow:
 * Home → Setup (configure) → Quiz (answer all) → Results → New Quiz → Setup
 */
test(
  'full e2e flow: setup → quiz → results → new quiz',
  { tag: ['@smoke'] },
  async ({ page }) => {
    // 1. Start from home
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
    ).toBeVisible()

    // 2. Navigate to setup
    await page.getByRole('link', { name: 'Start Quiz' }).click()
    await expect(
      page.getByRole('heading', { name: 'Quiz Settings' }),
    ).toBeVisible()

    // 3. Configure quiz: select medium difficulty
    const mediumBtn = page.getByTestId('difficulty-medium')
    await mediumBtn.click()
    await expect(mediumBtn).toHaveAttribute('aria-pressed', 'true')

    // 4. Start quiz
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page).toHaveURL(/\/quiz/)

    // 5. Verify quiz loaded
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

    // 6. Answer all questions
    await completeQuiz(page, 2)

    // 7-8. Wait for results and verify summary metrics
    await waitForResults(page)
    await expect(page.getByTestId('result-correct')).toBeVisible()
    await expect(page.getByTestId('result-incorrect')).toBeVisible()
    await expect(page.getByTestId('result-accuracy')).toBeVisible()

    // 9. Click New Quiz — back at setup
    await startNewQuiz(page)
  },
)
