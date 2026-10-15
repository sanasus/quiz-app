import { test, expect } from '@playwright/test'
import { mockQuestions } from '../src/shared/api/mock-questions'
import {
  answerCorrectly,
  completeQuiz,
  optionLocator,
  skipQuestion,
  startQuiz,
  waitForResults,
} from './fixtures'

/** Survival shows the whole mock pool as its question count. */
const survivalPoolSize = mockQuestions.length

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

      // Progress shows "1/2" — scope to the header heading: the
      // screen-reader live region repeats the same text.
      await expect(
        page.getByRole('heading', { name: 'Question 1/2' }),
      ).toBeVisible()

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

    // Progress moved to the second (last) question — the heading,
    // not the sr-only live region that repeats it.
    await expect(
      page.getByRole('heading', { name: 'Question 2/2' }),
    ).toBeVisible()
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

    // The question-count setting does not apply to survival: it starts
    // with the first batch of 10 questions, and the header shows the
    // whole pool (the API's `meta.total`, mocked as the fixture pool)
    await expect(
      page.getByRole('heading', {
        name: `Question 1/${survivalPoolSize}`,
        exact: true,
      }),
    ).toBeVisible()
  })

  test(
    'survival appends the next question batch near the pool edge',
    { tag: ['@slow'] },
    async ({ page }) => {
      // Ten questions × several interactions each — above the 30s default.
      test.setTimeout(60_000)

      await startQuiz(page, { mode: 'survival' })
      await expect(
        page.getByRole('heading', { name: `Question 1/${survivalPoolSize}` }),
      ).toBeVisible()

      // Only the first 10 questions are loaded up front; question 11
      // exists only if the prefetched batch (offset 10) was appended.
      for (let answered = 1; answered <= 10; answered++) {
        await answerCorrectly(page)
        await expect(
          page.getByRole('heading', {
            name: `Question ${answered + 1}/${survivalPoolSize}`,
          }),
        ).toBeVisible()
      }
    },
  )
})
