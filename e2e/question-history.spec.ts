import { test, expect, type Page } from '@playwright/test'
import { completeQuiz, startQuiz, waitForResults } from './fixtures'

/** Text of the question currently on screen. */
async function shownQuestion(page: Page) {
  const heading = page.getByRole('heading', { level: 3 })
  await expect(heading).toBeVisible()
  return heading.textContent()
}

test.describe('Question history', () => {
  test('the next quiz of the same kind starts with new questions', async ({
    page,
  }) => {
    await startQuiz(page, { questionCount: 2 })
    const first = await shownQuestion(page)
    await completeQuiz(page, 2)
    await waitForResults(page)

    await startQuiz(page, { questionCount: 2 })

    expect(await shownQuestion(page)).not.toBe(first)
  })

  test('a reported question is never shown again', async ({ page }) => {
    // The hard mock pool is exactly two questions.
    await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
    const reported = await shownQuestion(page)
    await page.getByTestId('report-question').click()
    await expect(
      page.getByText('This question will not be shown again'),
    ).toBeVisible()
    await expect(page.getByTestId('report-question')).toBeDisabled()
    await completeQuiz(page, 2)
    await waitForResults(page)

    await startQuiz(page, { difficulty: 'hard', questionCount: 2 })

    await expect(
      page.getByRole('heading', { name: 'Question 1/1', exact: true }),
    ).toBeVisible()
    expect(await shownQuestion(page)).not.toBe(reported)
  })

  test('says so when only repeats are left', async ({ page }) => {
    await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
    await completeQuiz(page, 2)
    await waitForResults(page)

    await startQuiz(page, { difficulty: 'hard', questionCount: 2 })

    await expect(
      page.getByText('No new questions left here, so some are repeats.'),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Question 1/2', exact: true }),
    ).toBeVisible()
  })
})
