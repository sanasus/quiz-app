import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'
import {
  answerFirstOption,
  completeQuiz,
  optionLocator,
  startQuiz,
  waitForResults,
} from './fixtures'

type Theme = 'light' | 'dark'

/** Only serious/critical findings fail the run (minor ones are advisory). */
async function expectNoSeriousViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    serious.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target.join(' ')),
    })),
    `axe violations on ${where}`,
  ).toEqual([])
}

/** The theme is read before first paint, so seed it ahead of every load. */
async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => {
    localStorage.setItem(
      'quiz-settings',
      JSON.stringify({
        state: { theme: value, animations: false },
        version: 1,
      }),
    )
  }, theme)
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Accessibility (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await useTheme(page, theme)
    })

    test('home', { tag: ['@smoke'] }, async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('link', { name: 'Start Quiz' })).toBeVisible()
      await expectNoSeriousViolations(page, `/ (${theme})`)
    })

    test('setup', { tag: ['@smoke'] }, async ({ page }) => {
      await page.goto('/setup')
      await expect(page.getByTestId('category-dropdown')).toBeVisible()
      await expectNoSeriousViolations(page, `/setup (${theme})`)
    })

    test('quiz, before and after answering', async ({ page }) => {
      await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
      await expectNoSeriousViolations(page, `/quiz question (${theme})`)

      await optionLocator(page).first().click()
      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
      await expectNoSeriousViolations(page, `/quiz answered (${theme})`)
    })

    test('results', async ({ page }) => {
      await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
      await completeQuiz(page, 2)
      await waitForResults(page)
      await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()
      // The share button fades in from its disabled state while the card
      // renders; axe must not sample the colors mid-transition.
      await expect(
        page.getByRole('button', { name: 'Share result' }),
      ).toHaveCSS('opacity', '1')
      await expectNoSeriousViolations(page, `/results (${theme})`)
    })

    test('stats with data', async ({ page }) => {
      await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
      await completeQuiz(page, 2)
      await waitForResults(page)
      await page.getByRole('link', { name: 'Statistics' }).click()
      await expect(page.getByTestId('stats-sessions')).toBeVisible()
      await expectNoSeriousViolations(page, `/stats (${theme})`)
    })

    test('achievements', async ({ page }) => {
      await page.goto('/achievements')
      await expect(page.getByTestId('achievement-first_blood')).toBeVisible()
      await expectNoSeriousViolations(page, `/achievements (${theme})`)
    })

    test('settings', { tag: ['@smoke'] }, async ({ page }) => {
      await page.goto('/settings')
      await expect(page.getByTestId('settings-screen')).toBeVisible()
      await expectNoSeriousViolations(page, `/settings (${theme})`)
    })
  })
}

test.describe('Screen reader behaviour', () => {
  test('focus lands on the new question after Next', async ({ page }) => {
    await startQuiz(page, { questionCount: 3 })
    await answerFirstOption(page)

    // The Next button that was just used is gone: focus must move to the
    // new question, not fall back to <body>.
    await expect(page.getByRole('heading', { level: 3 })).toBeFocused()
  })

  test('the answer result is announced in a polite live region', async ({
    page,
  }) => {
    await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
    const live = page.locator('p.sr-only[aria-live="polite"]')
    await expect(live).toHaveText(/Question 1\/2/)

    await optionLocator(page).first().click()

    // Hard + first option is wrong in the mock pool.
    await expect(live).toHaveText(/incorrect|wrong/i)
  })
})
