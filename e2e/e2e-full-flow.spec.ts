import { test, expect } from '@playwright/test'
import {
  answerFirstOption,
  waitForResults,
  startNewQuiz,
} from './fixtures'

/**
 * Full end-to-end flow:
 * Home → Setup (configure) → Quiz (answer all) → Results → New Quiz → Setup
 */
test('full e2e flow: setup → quiz → results → new quiz', async ({ page }) => {
  // 1. Start from home
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '🏠 Welcome to QuizApp!' }),
  ).toBeVisible()

  // 2. Navigate to setup
  await page
    .getByRole('link', { name: 'Start Quiz' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Quiz Settings' }),
  ).toBeVisible()

  // 3. Configure quiz: select medium difficulty
  await page.getByRole('button', { name: 'Medium' }).click()

  // 4. Start quiz
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForURL('/quiz**')

  // 5. Verify quiz loaded
  await expect(
    page.getByRole('heading', { name: 'Question' }),
  ).toBeVisible()

  // 6. Answer all questions using generic selectors
  for (let i = 0; i < 2; i++) {
    await answerFirstOption(page)
  }

  // 7. Wait for results
  await waitForResults(page)

  // 8. Verify results displayed
  await expect(page.getByText('Correct', { exact: true })).toBeVisible()
  await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
  await expect(page.getByText('Accuracy')).toBeVisible()

  // 9. Click New Quiz
  await startNewQuiz(page)
})
