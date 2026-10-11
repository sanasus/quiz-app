import { type Page, test as base, expect } from '@playwright/test'

/**
 * Shared fixtures for quiz e2e tests.
 *
 * Usage:
 *   import { test, goToQuiz } from './fixtures'
 *
 *   test('something', async ({ goToQuiz }) => {
 *     const page = await goToQuiz()
 *   })
 *
 * Or use standalone helpers directly:
 *   import { goToSetup, startQuiz, answerQuestion } from './fixtures'
 */

// ── Quiz config helpers ──────────────────────────────────────────────────────

export interface QuizConfig {
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  mode: 'classic' | 'timed' | 'blitz' | 'survival'
}

const defaultConfig: QuizConfig = {
  category: 'all',
  difficulty: 'easy',
  questionCount: 2,
  mode: 'classic',
}

/**
 * Select a difficulty level button on the setup page.
 * Uses data-testid for a stable, unambiguous selector.
 */
export async function selectDifficulty(page: Page, difficulty: QuizConfig['difficulty']) {
  const btn = page.getByTestId(`difficulty-${difficulty}`)
  await btn.click()
}

/**
 * Set the question count slider to a specific value.
 * Uses evaluate to reliably set range input value and dispatch input event.
 */
export async function setQuestionCount(page: Page, count: number) {
  await page.locator('input[type="range"]').fill(String(count))
}

/**
 * Navigate to setup page and wait for it to be ready.
 */
export async function goToSetup(page: Page) {
  await page.goto('/setup')
  // Wait for the category dropdown to be visible
  const dropdown = page.getByTestId('category-dropdown')
  await expect(dropdown).toBeVisible()
}

/**
 * Select a game mode on the setup page.
 * Uses data-testid for stable, unambiguous selector.
 */
export async function selectMode(page: Page, mode: QuizConfig['mode']) {
  const btn = page.getByTestId(`mode-${mode}`)
  await btn.click()
}

/**
 * Navigate from setup to quiz with the given config.
 * Returns the page ready at /quiz with questions loaded.
 */
export async function startQuiz(page: Page, config?: Partial<QuizConfig>) {
  const mergedConfig = { ...defaultConfig, ...config }
  await goToSetup(page)

  // Select difficulty (skip when undefined — defaults to 'easy')
  if (mergedConfig.difficulty && mergedConfig.difficulty !== 'easy') {
    await selectDifficulty(page, mergedConfig.difficulty)
  }

  // Set question count
  if (mergedConfig.questionCount && mergedConfig.questionCount !== defaultConfig.questionCount) {
    await setQuestionCount(page, mergedConfig.questionCount)
  }

  // Select mode
  if (mergedConfig.mode !== 'classic') {
    await selectMode(page, mergedConfig.mode)
  }

  // Start
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForURL('/quiz**')

  // Wait for questions to load
  await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

  return page
}

// ── Answer helpers ───────────────────────────────────────────────────────────

/**
 * Answer a question: select an option, submit, then click Next if available.
 * Uses specific option name (not generic).
 */
export async function answerQuestion(
  page: Page,
  optionName: string,
  expectNext = true,
) {
  await page.getByRole('button', { name: optionName }).click()
  await page.getByRole('button', { name: 'Submit' }).click()

  if (expectNext) {
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
  }
}

/**
 * Answer the first visible option and click Next.
 * Scopes to the quiz options container to avoid matching nav buttons.
 */
export async function answerFirstOption(page: Page) {
  // Use options-only selector to avoid matching Next/Skip/Submit buttons
  const options = page.locator('[data-testid^="option-"]')
  await expect(options.first()).toBeVisible()
  await options.first().click()
  await page.getByRole('button', { name: 'Submit' }).click()

  // Click next if available (auto-wait with short timeout)
  try {
    await expect(page.getByRole('button', { name: 'Next' })).toBeAttached()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()
  } catch {
    // Next button not available — quiz may be over
  }
}

/**
 * Skip the current question.
 */
export async function skipQuestion(page: Page) {
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
}

// ── Results helpers ──────────────────────────────────────────────────────────

/**
 * Navigate to results page (expecting it to be ready).
 */
export async function waitForResults(page: Page) {
  await page.waitForURL('/results**')
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  return page
}

/**
 * Click "New Quiz" and wait for setup.
 */
export async function startNewQuiz(page: Page) {
  await page.getByRole('button', { name: 'New Quiz' }).click()
  await page.waitForURL('/setup')
  await expect(page.getByRole('heading', { name: 'Quiz Settings' })).toBeVisible()
  return page
}

// ── Test fixture ─────────────────────────────────────────────────────────────

const test_ = base.extend<{
  /** Navigate to setup and wait for it to be ready. */
  goToSetup: () => Promise<Page>
  /** Start a quiz with the given config (or defaults). */
  startQuiz: (config?: QuizConfig) => Promise<Page>
  /** Answer a question and click Next. */
  answerQuestion: (option: string, expectNext?: boolean) => Promise<Page>
  /** Answer the first visible option and click Next. */
  answerFirstOption: () => Promise<void>
  /** Skip the current question and go to Next. */
  skipQuestion: () => Promise<Page>
  /** Wait for results page to be visible. */
  waitForResults: () => Promise<Page>
  /** Click "New Quiz" and wait for setup. */
  startNewQuiz: () => Promise<Page>
}>({
  goToSetup: async ({ page }, use) => {
    await use(goToSetup(page))
  },
  startQuiz: async ({ page }, use) => {
    await use(startQuiz(page))
  },
  answerQuestion: async ({ page }, use) => {
    await use((option: string, expectNext = true) =>
      answerQuestion(page, option, expectNext),
    )
  },
  answerFirstOption: async ({ page }, use) => {
    await use(() => answerFirstOption(page))
  },
  skipQuestion: async ({ page }, use) => {
    await use(() => skipQuestion(page))
  },
  waitForResults: async ({ page }, use) => {
    await use(() => waitForResults(page))
  },
  startNewQuiz: async ({ page }, use) => {
    await use(() => startNewQuiz(page))
  },
})

export { test_ as test }
