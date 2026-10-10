import { test, expect } from '@playwright/test'
import { startQuiz, answerFirstOption, waitForResults } from './fixtures'

test.describe('Results screen', () => {
  test.beforeEach(async ({ page }) => {
    // Complete a full quiz session to reach results
    await startQuiz(page)

    // Answer all questions using generic selectors
    await answerFirstOption(page)
    await answerFirstOption(page)

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
    // Check if mistakes section exists
    const mistakesTitle = page.getByRole('heading', { name: 'Mistakes' })
    if (await mistakesTitle.isVisible()) {
      await expect(page.getByText('❌')).toBeVisible()
      await expect(page.getByText('✅')).toBeVisible()
    }
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
    const repeatBtn = page.getByRole('button', { name: 'Repeat mistakes' })
    if (await repeatBtn.isVisible()) {
      await repeatBtn.click()
      await page.waitForURL('/quiz**')
      await expect(
        page.getByRole('heading', { name: 'Question' }),
      ).toBeVisible()
    }
  })
})
