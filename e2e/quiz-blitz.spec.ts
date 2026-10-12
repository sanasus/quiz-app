import { test, expect } from '@playwright/test'
import {
  completeQuiz,
  optionLocator,
  startNewQuiz,
  startQuiz,
  waitForResults,
} from './fixtures'

test.describe('Blitz mode', { tag: ['@slow'] }, () => {
  test.beforeEach(async ({ page }) => {
    await startQuiz(page, { mode: 'blitz', questionCount: 3 })
  })

  // ---------------------------------------------------------------------------
  // Timer and header
  // ---------------------------------------------------------------------------

  test('displays score and streak in header', async ({ page }) => {
    await expect(page.getByText(/Score:/)).toBeVisible()
    await expect(page.getByText(/🔥/)).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Auto-submit behavior
  // ---------------------------------------------------------------------------

  test('auto-submits on selection without a Submit button', async ({
    page,
  }) => {
    const options = optionLocator(page)
    await expect(options.first()).toBeVisible()

    // Clicking an option auto-submits: Submit disappears, Next appears
    await options.first().click()
    await expect(page.getByRole('button', { name: 'Submit' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
  })

  test('shows explanation after auto-submit', async ({ page }) => {
    const options = optionLocator(page)
    await expect(options.first()).toBeVisible()

    await options.first().click()
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()

    // Mock data includes explanations
    await expect(
      page.getByRole('heading', { name: 'Explanation' }),
    ).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Question progression
  // ---------------------------------------------------------------------------

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

  test('completes all questions and navigates to results', async ({ page }) => {
    await completeQuiz(page, 3, { autoSubmit: true })
    await waitForResults(page)
  })

  test('results show correct score for Blitz mode', async ({ page }) => {
    await completeQuiz(page, 3, { autoSubmit: true })
    await waitForResults(page)

    // Score card and stats labels should be visible
    await expect(page.getByText('Score')).toBeVisible()
    await expect(page.getByText('Correct', { exact: true })).toBeVisible()
    await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
    await expect(page.getByText('Accuracy')).toBeVisible()
  })

  test('New Quiz button works from results in Blitz mode', async ({ page }) => {
    await completeQuiz(page, 3, { autoSubmit: true })
    await startNewQuiz(page)
  })
})

// Own describe: these tests configure their own quiz, so they don't share
// the 3-question beforeEach above (avoids a redundant setup round-trip).
test.describe('Blitz answer feedback', { tag: ['@slow'] }, () => {
  test('highlights correct and incorrect answers after auto-submit', async ({
    page,
  }) => {
    // Hard difficulty: the first option is wrong in mock data (red highlight)
    await startQuiz(page, {
      mode: 'blitz',
      questionCount: 2,
      difficulty: 'hard',
    })

    const options = optionLocator(page)
    await expect(options.first()).toBeVisible()
    await options.first().click()
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()

    const quizScreen = page.getByTestId('quiz-screen')
    await expect(
      quizScreen.locator('[data-state="correct"]').first(),
    ).toBeVisible()
    await expect(
      quizScreen.locator('[data-state="incorrect"]').first(),
    ).toBeVisible()
  })
})

test.describe('Blitz custom settings', { tag: ['@slow'] }, () => {
  test('timer starts at the limit for the question count', async ({ page }) => {
    // getBlitzTimeLimit(5) = max(10, 5 * 3) = 15s (allow one tick of drift)
    await startQuiz(page, { mode: 'blitz', questionCount: 5 })
    await expect(page.getByTestId('quiz-timer')).toHaveText(/^1[0-5]s$/)

    // Answer all questions before time runs out
    await completeQuiz(page, 5, { autoSubmit: true })
    await waitForResults(page)
  })

  test('works with medium difficulty', async ({ page }) => {
    await startQuiz(page, {
      mode: 'blitz',
      difficulty: 'medium',
      questionCount: 3,
    })
    await completeQuiz(page, 3, { autoSubmit: true })
    await waitForResults(page)
  })
})
