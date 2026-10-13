import { test, expect } from '@playwright/test'
import {
  completeQuiz,
  optionLocator,
  skipQuestion,
  startQuiz,
  waitForResults,
} from './fixtures'

test.describe('Quiz screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate through setup to quiz
    await startQuiz(page)
  })

  test(
    'displays first question with options',
    { tag: ['@smoke'] },
    async ({ page }) => {
      // Question heading visible
      await expect(
        page.getByRole('heading', { name: 'Question' }),
      ).toBeVisible()

      // Progress shows "1 of 2"
      await expect(page.getByText('1 of 2')).toBeVisible()

      // 4 answer options — action buttons asserted separately
      await expect(optionLocator(page)).toHaveCount(4)
      await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible()
    },
  )

  test('selecting an option highlights it', async ({ page }) => {
    const options = optionLocator(page)
    await expect(options.first()).toBeVisible()
    await options.first().click()

    // Selected option should have aria-selected="true"
    await expect(options.first()).toHaveAttribute('aria-selected', 'true')
  })

  test('submitting an answer shows explanation and next button', async ({
    page,
  }) => {
    const options = optionLocator(page)
    await expect(options.first()).toBeVisible()
    await options.first().click()

    // Submit button should be visible, then Next appears after submit
    const submitBtn = page.getByRole('button', { name: 'Submit' })
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
  })

  test(
    'actions stay reachable after answering on mobile',
    { tag: ['@mobile'] },
    async ({ page }) => {
      // Realistic phone viewport — the answer feedback (explanation) grows
      // the page, so the action row must not be pushed below the fold.
      await page.setViewportSize({ width: 375, height: 667 })

      const options = optionLocator(page)
      await expect(options.first()).toBeVisible()
      await options.first().click()
      await page.getByRole('button', { name: 'Submit' }).click()

      const next = page.getByRole('button', { name: 'Next' })
      await expect(next).toBeVisible()
      await expect(next).toBeInViewport()
    },
  )

  test('skipping a question advances to next', async ({ page }) => {
    await skipQuestion(page)

    // Progress moved to the second (last) question
    await expect(page.getByText('2 of 2')).toBeVisible()
  })

  test(
    'completing all questions navigates to results',
    { tag: ['@smoke'] },
    async ({ page }) => {
      await completeQuiz(page, 2)
      await waitForResults(page)
    },
  )

  test('shows score and streak in header', async ({ page }) => {
    // Score should be visible
    await expect(page.getByText(/Score:/)).toBeVisible()

    // Streak should be visible
    await expect(page.getByText('Streak')).toBeVisible()
  })

  test('timed mode shows timer', async ({ page }) => {
    await startQuiz(page, { mode: 'timed' })

    // Timer shows a number followed by 's'
    await expect(page.getByTestId('quiz-timer')).toHaveText(/^\d+s$/)
  })

  test('survival mode shows lives', async ({ page }) => {
    await startQuiz(page, { mode: 'survival' })

    // Wait for question to appear
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

    // Lives show as heart emojis (❤️)
    await expect(page.getByTestId('quiz-lives')).toHaveText(/❤️+/)

    // The question-count setting does not apply to survival: it always
    // starts with the first batch of 10 questions (the default count is 2)
    await expect(
      page.getByRole('heading', { name: 'Question 1/10', exact: true }),
    ).toBeVisible()
  })
})
