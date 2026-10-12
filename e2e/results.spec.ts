import { test, expect } from '@playwright/test'
import { completeQuiz, startQuiz, waitForResults } from './fixtures'

test.describe('Results screen', () => {
  test.beforeEach(async ({ page }) => {
    // Hard difficulty + first-option answers (wrong in mock data) →
    // guaranteed mistakes and fully deterministic metrics.
    await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
    await completeQuiz(page, 2)
    await waitForResults(page)
  })

  test('displays summary metrics', { tag: ['@smoke'] }, async ({ page }) => {
    // Both answers are wrong in mock data → deterministic values
    await expect(page.getByTestId('result-score')).toHaveText('0')
    await expect(page.getByTestId('result-correct')).toHaveText('0')
    await expect(page.getByTestId('result-incorrect')).toHaveText('2')
    await expect(page.getByTestId('result-accuracy')).toHaveText('0%')
    await expect(page.getByTestId('result-time')).toHaveText(/^\d+:\d{2}$/)
  })

  test('shows mistakes list when there are mistakes', async ({ page }) => {
    // Mistakes section should be visible (guaranteed by beforeEach)
    const mistakesTitle = page.getByRole('heading', { name: 'Mistakes' })
    await expect(mistakesTitle).toBeVisible()
    await expect(page.getByText('❌ O(n)')).toBeVisible()
    await expect(page.getByText('✅ O(log n)')).toBeVisible()
  })

  test('new quiz button navigates to setup', async ({ page }) => {
    const newQuizBtn = page.getByRole('button', { name: 'New Quiz' })
    await expect(newQuizBtn).toBeVisible()
    await newQuizBtn.click()

    await expect(page).toHaveURL(/\/setup/)
    await expect(
      page.getByRole('heading', { name: 'Quiz Settings' }),
    ).toBeVisible()
  })

  test('repeat mistakes button navigates to quiz', async ({ page }) => {
    // Repeat mistakes button should be visible (guaranteed by beforeEach)
    const repeatBtn = page.getByRole('button', { name: 'Repeat mistakes' })
    await expect(repeatBtn).toBeVisible()
    await repeatBtn.click()

    await expect(page).toHaveURL(/\/quiz/)
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()
  })
})
