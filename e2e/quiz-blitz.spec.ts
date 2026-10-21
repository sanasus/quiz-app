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
    await expect(page.getByText(/Streak/)).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Auto-submit behavior
  // ---------------------------------------------------------------------------

  test('answers on selection without a Submit button', async ({ page }) => {
    const options = optionLocator(page)
    await expect(options.first()).toBeVisible()

    // Clicking an option answers it: Next appears
    await options.first().click()
    await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0)
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
  // Results
  // ---------------------------------------------------------------------------

  test('completes all questions and navigates to results', async ({ page }) => {
    await completeQuiz(page, 3)
    await waitForResults(page)
  })

  test('results show correct score for Blitz mode', async ({ page }) => {
    await completeQuiz(page, 3)
    await waitForResults(page)

    // Score card and stats labels should be visible
    await expect(page.getByText('Score')).toBeVisible()
    await expect(page.getByText('Correct', { exact: true })).toBeVisible()
    await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
    await expect(page.getByText('Accuracy')).toBeVisible()
  })

  test('New Quiz button works from results in Blitz mode', async ({ page }) => {
    await completeQuiz(page, 3)
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
  test('timer starts at 10s per question', async ({ page }) => {
    // Fixed 10s per question, whatever the question count (allow one
    // tick of drift)
    await startQuiz(page, { mode: 'blitz', questionCount: 5 })
    await expect(page.getByTestId('quiz-timer')).toHaveText(/^(9|10)s$/)

    // Answer all questions before time runs out
    await completeQuiz(page, 5)
    await waitForResults(page)
  })

  test('works with medium difficulty', async ({ page }) => {
    await startQuiz(page, {
      mode: 'blitz',
      difficulty: 'medium',
      questionCount: 3,
    })
    await completeQuiz(page, 3)
    await waitForResults(page)
  })
})
