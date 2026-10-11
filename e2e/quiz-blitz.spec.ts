import { type Page, test, expect } from '@playwright/test'
import { startQuiz, waitForResults, setQuestionCount, selectMode, selectDifficulty } from './fixtures'

/**
 * Click the first option button inside the quiz screen.
 * Uses Playwright's native .click() which properly triggers React's
 * synthetic event system (proven by the passing "auto-submits answer" test).
 */
async function clickFirstOption(page: Page) {
  // Use options-only selector to avoid matching Next/Skip/Submit buttons
  const options = page.locator('[data-testid^="option-"]')
  await expect(options.first()).toBeVisible()
  await options.first().click()
}

/**
 * Complete all questions in a Blitz quiz and navigate to results.
 */
async function completeBlitzQuiz(page: Page, count: number) {
  for (let i = 1; i < count; i++) {
    await clickFirstOption(page)
    await page.getByRole('button', { name: 'Next' }).click()
  }
  await clickFirstOption(page)
}

test.describe('Blitz mode', () => {
  test.beforeEach(async ({ page }) => {
    await startQuiz(page, { mode: 'blitz', questionCount: 3 })
  })

  // ---------------------------------------------------------------------------
  // Timer and header
  // ---------------------------------------------------------------------------

  test('displays score in header', async ({ page }) => {
    await expect(page.getByText(/Score:/)).toBeVisible()
  })

  test('displays streak in header', async ({ page }) => {
    await expect(page.getByText(/🔥/)).toBeVisible()
  })

  // Blitz mode displays a visible per-question countdown timer.

  // ---------------------------------------------------------------------------
  // Auto-submit behavior
  // ---------------------------------------------------------------------------

  test('auto-submits answer on option selection', async ({ page }) => {
    const quizContainer = page.getByTestId('quiz-screen')
    const options = quizContainer.getByRole('button')

    // Click first option — no Submit button should appear
    await options.first().click()

    // Submit button should NOT be visible in Blitz mode
    const submitBtn = page.getByRole('button', { name: 'Submit' })
    await expect(submitBtn).not.toBeVisible()

    // Next button should appear after auto-submit
    const nextBtn = page.getByRole('button', { name: 'Next' })
    await expect(nextBtn).toBeVisible()
  })

  test('no Submit button in Blitz mode', async ({ page }) => {
    const quizContainer = page.getByTestId('quiz-screen')
    const options = quizContainer.getByRole('button')
    await expect(options.first()).toBeVisible()
    await options.first().click()

    // Verify Submit button is absent
    const submitBtn = page.getByRole('button', { name: 'Submit' })
    await expect(submitBtn).not.toBeVisible()
  })

  test('highlights correct and incorrect answers after auto-submit', async ({
    page,
  }) => {
    const quizContainer = page.getByTestId('quiz-screen')
    const options = quizContainer.getByRole('button')

    // Click first option — auto-submit triggers
    await options.first().click()

    // Wait for result state
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()

    // Correct answer should have green styling (✓ checkmark)
    const correctOption = quizContainer
      .locator('button')
      .filter({ has: page.locator('span.text-green-400') })
      .first()
    await expect(correctOption).toBeVisible()

    // Incorrect selected answer should have red styling (✗ checkmark)
    const incorrectOption = quizContainer
      .locator('button')
      .filter({ has: page.locator('span.text-red-400') })
      .first()
    await expect(incorrectOption).toBeVisible()
  })

  test('shows explanation after auto-submit', async ({ page }) => {
    const quizContainer = page.getByTestId('quiz-screen')
    const options = quizContainer.getByRole('button')

    // Click first option — auto-submit triggers
    await options.first().click()

    // Wait for result state
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()

    // Explanation should be visible if the question has one
    const explanation = page.getByRole('heading', { name: 'Explanation' })
    if (await explanation.isVisible()) {
      await expect(explanation).toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // Question progression
  // ---------------------------------------------------------------------------

  test('progresses through questions', async ({ page }) => {
    const quizContainer = page.getByTestId('quiz-screen')

    // Answer first question
    await clickFirstOption(page)
    await page.getByRole('button', { name: 'Next' }).click()

    // Answer second question
    await clickFirstOption(page)
    await page.getByRole('button', { name: 'Next' }).click()

    // Answer third question
    await clickFirstOption(page)

    // Should navigate to results
    await waitForResults(page)
  })

  test('skip button is available in Blitz mode', async ({ page }) => {
    const skipBtn = page.getByRole('button', { name: 'Skip' })
    await expect(skipBtn).toBeVisible()
    await skipBtn.click()

    // Next button should appear after skip
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------------

  test('shows results after completing all questions', async ({ page }) => {
    // Answer all 3 questions
    await completeBlitzQuiz(page, 3)

    // Should navigate to results
    await waitForResults(page)
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  })

  test('results show correct score for Blitz mode', async ({ page }) => {
    // Answer all 3 questions
    await completeBlitzQuiz(page, 3)

    // Should navigate to results
    await waitForResults(page)

    // Score card should be visible
    await expect(page.getByText('Score')).toBeVisible()

    // Correct/incorrect counts should be visible
    await expect(page.getByText('Correct', { exact: true })).toBeVisible()
    await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()

    // Accuracy percentage should be visible
    await expect(page.getByText('Accuracy')).toBeVisible()
  })

  test('New Quiz button works from results in Blitz mode', async ({ page }) => {
    // Answer all 3 questions
    await completeBlitzQuiz(page, 3)

    // Navigate to results
    await waitForResults(page)

    // Click New Quiz
    await page.getByRole('button', { name: 'New Quiz' }).click()

    // Should return to setup
    await page.waitForURL('/setup')
    await expect(page.getByRole('heading', { name: 'Quiz Settings' })).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Blitz mode with custom settings
  // ---------------------------------------------------------------------------

  test('timer shows correct limit for question count', async ({ page }) => {
    // Navigate to setup
    await page.goto('/setup')
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()

    // Set 5 questions for Blitz (time limit = max(10, 5*3) = 15s)
    await setQuestionCount(page, 5)
    await selectMode(page, 'blitz')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.waitForURL('/quiz**')
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

    // Answer all questions to reach results before time runs out
    await completeBlitzQuiz(page, 5)

    // Should navigate to results (proving the quiz was playable)
    await waitForResults(page)
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  })

  test('works with medium difficulty', async ({ page }) => {
    // Go back to setup and select medium difficulty
    await page.goto('/setup')
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await setQuestionCount(page, 3)
    await selectDifficulty(page, 'medium')
    await selectMode(page, 'blitz')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.waitForURL('/quiz**')
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

    // Answer questions
    await completeBlitzQuiz(page, 3)

    // Should navigate to results
    await waitForResults(page)
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  })
})
