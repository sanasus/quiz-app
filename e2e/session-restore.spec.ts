import { test, expect } from '@playwright/test'
import { answerFirstOption, startQuiz } from './fixtures'

test.describe('Session restore and leave guard', () => {
  test.beforeEach(async ({ page }) => {
    // Reloading mid-quiz arms the browser's beforeunload prompt; accept it.
    page.on('dialog', (dialog) => dialog.accept())
    await startQuiz(page, { questionCount: 3 })
    await answerFirstOption(page)
    await expect(
      page.getByRole('heading', { name: 'Question 2/3' }),
    ).toBeVisible()
  })

  test(
    'reload on /quiz resumes the same question',
    { tag: ['@smoke'] },
    async ({ page }) => {
      await page.reload()

      await expect(page).toHaveURL(/\/quiz/)
      await expect(
        page.getByRole('heading', { name: 'Question 2/3' }),
      ).toBeVisible()
    },
  )

  test('home offers to continue after a reload', async ({ page }) => {
    await page.reload()
    await page.goto('/')

    const prompt = page.getByTestId('resume-quiz')
    await expect(prompt).toContainText('question 2 of 3')
    await prompt.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/\/quiz/)
    await expect(
      page.getByRole('heading', { name: 'Question 2/3' }),
    ).toBeVisible()
  })

  test('starting over drops the stored run', async ({ page }) => {
    await page.goto('/')

    const prompt = page.getByTestId('resume-quiz')
    await prompt.getByRole('button', { name: 'Start over' }).click()
    await expect(prompt).toBeHidden()

    await page.reload()
    await expect(page.getByTestId('resume-quiz')).toHaveCount(0)
  })

  test('leaving mid-quiz asks first and can be cancelled', async ({ page }) => {
    await page.getByRole('link', { name: 'Home' }).click()
    const dialog = page.getByTestId('leave-quiz')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Stay' }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/quiz/)

    await page.getByRole('link', { name: 'Home' }).click()
    await page
      .getByTestId('leave-quiz')
      .getByRole('button', { name: 'Leave' })
      .click()

    await expect(page).toHaveURL(/\/$/)
    // The abandoned run is gone: no resume prompt on home.
    await expect(page.getByTestId('resume-quiz')).toHaveCount(0)
  })
})
