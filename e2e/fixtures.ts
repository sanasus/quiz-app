import { type Page, expect } from '@playwright/test'
import { mockQuestions } from '../src/shared/api/mock-questions'

/**
 * Shared helpers for quiz e2e tests.
 *
 * Plain functions — specs import them directly:
 *
 *   import { startQuiz, completeQuiz, waitForResults } from './fixtures'
 *
 * Locale is deterministic: playwright.config.ts pins `locale: 'en-US'`,
 * so i18n detection (querystring → localStorage → navigator) always
 * resolves to English regardless of the host machine.
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
 * Answer options only — excludes Skip/Submit/Next action buttons.
 * Single source of truth for scoping quiz option interactions.
 */
export function optionLocator(page: Page) {
  return page.locator('[data-testid^="option-"]')
}

/**
 * Select a difficulty level on the setup page.
 */
export async function selectDifficulty(
  page: Page,
  difficulty: QuizConfig['difficulty'],
) {
  await page.getByTestId(`difficulty-${difficulty}`).click()
}

/**
 * Set the question count slider. `fill()` sets the value and dispatches
 * the input event React listens to.
 */
export async function setQuestionCount(page: Page, count: number) {
  await page.locator('input[type="range"]').fill(String(count))
}

/**
 * Navigate to the setup page and wait for it to be ready.
 */
export async function goToSetup(page: Page) {
  await page.goto('/setup')
  await expect(page.getByTestId('category-dropdown')).toBeVisible()
}

/**
 * Select a game mode on the setup page.
 */
export async function selectMode(page: Page, mode: QuizConfig['mode']) {
  await page.getByTestId(`mode-${mode}`).click()
}

/**
 * Select a category on the setup page: open the dropdown, expand the
 * topic, pick the category — the panel closes on selection and the
 * trigger shows the picked name.
 */
export async function selectCategory(
  page: Page,
  topic: string,
  category: string,
) {
  const dropdown = page.getByTestId('category-dropdown')
  await expect(dropdown).toBeVisible()
  await dropdown.click()
  await page.getByRole('button', { name: topic }).click()
  await page.getByRole('button', { name: category }).click()
}

/**
 * Navigate from setup to the quiz with the given config.
 * Returns the page ready at /quiz with the first question loaded.
 */
export async function startQuiz(page: Page, config?: Partial<QuizConfig>) {
  const mergedConfig = { ...defaultConfig, ...config }
  await goToSetup(page)

  if (mergedConfig.difficulty !== defaultConfig.difficulty) {
    await selectDifficulty(page, mergedConfig.difficulty)
  }

  if (mergedConfig.questionCount !== defaultConfig.questionCount) {
    await setQuestionCount(page, mergedConfig.questionCount)
  }

  if (mergedConfig.mode !== defaultConfig.mode) {
    await selectMode(page, mergedConfig.mode)
  }

  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page).toHaveURL(/\/quiz/)
  await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()

  return page
}

/**
 * Start the quiz from the setup page that is already open — unlike
 * startQuiz it never calls page.goto(): a reload re-forces providerId
 * back to 'mock' (provider-store merge in mock mode), undoing a live
 * provider switch from provider-switch.spec.ts.
 *
 * Waits for the category dropdown first: it only renders once the
 * setup queries settled.
 */
export async function startFromCurrentSetup(page: Page) {
  await expect(page.getByTestId('category-dropdown')).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page).toHaveURL(/\/quiz/)
}

// ── Provider helpers ────────────────────────────────────────────────────────

/**
 * Pick a question source in /settings and wait for the redirect to
 * /setup. The switch itself is client-side: afterwards the test must
 * navigate with clicks only (see startFromCurrentSetup).
 */
export async function selectProvider(page: Page, label: string) {
  await page
    .getByTestId('provider-selector')
    .getByRole('radio', { name: label })
    .click()
  await expect(page).toHaveURL(/\/setup/)
}

// ── Answer helpers ───────────────────────────────────────────────────────────

export interface AnswerOptions {
  /**
   * Click Next after answering. Set to `false` on the last question —
   * the quiz finishes itself and navigates to /results automatically.
   */
  next?: boolean
  /** Blitz auto-submits on selection, so there is no Submit button. */
  autoSubmit?: boolean
}

/**
 * Select the first visible answer option.
 */
export async function selectFirstOption(page: Page) {
  const options = optionLocator(page)
  await expect(options.first()).toBeVisible()
  await options.first().click()
}

/**
 * Answer the first option: select it, submit (unless the mode
 * auto-submits) and optionally advance to the next question.
 */
export async function answerFirstOption(
  page: Page,
  { next = true, autoSubmit = false }: AnswerOptions = {},
) {
  await selectFirstOption(page)

  if (!autoSubmit) {
    await page.getByRole('button', { name: 'Submit' }).click()
  }

  if (next) {
    const nextBtn = page.getByRole('button', { name: 'Next' })
    await expect(nextBtn).toBeVisible()
    await nextBtn.click()
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible()
  }
}

/**
 * Answer every question with the first option. After the last question
 * the quiz auto-navigates to /results — assert it with `waitForResults`.
 */
export async function completeQuiz(
  page: Page,
  questionCount: number,
  options: Omit<AnswerOptions, 'next'> = {},
) {
  for (let i = 0; i < questionCount; i++) {
    await answerFirstOption(page, { ...options, next: i < questionCount - 1 })
  }
}

/**
 * Skip the current question and advance to the next one.
 */
export async function skipQuestion(page: Page) {
  await page.getByRole('button', { name: 'Skip' }).click()
  const nextBtn = page.getByRole('button', { name: 'Next' })
  await expect(nextBtn).toBeVisible()
  await nextBtn.click()
}

/**
 * Answer the current question correctly and advance.
 *
 * Survival grants only 3 lives, so blindly picking the first option
 * ends the run early. The mock pool is the source of truth: match the
 * visible question text and click the correct option(s). Handles
 * multiple-choice questions (several correct options) too.
 *
 * At the pool's edge the Next click auto-waits for the prefetched
 * batch (Next is disabled while the batch is pending).
 */
export async function answerCorrectly(page: Page) {
  const text = await page.getByRole('heading', { level: 3 }).textContent()
  const question = mockQuestions.find((q) => q.text === text)
  if (!question) throw new Error(`Unknown mock question: ${text}`)

  for (const id of question.correctOptionIds) {
    await page.getByTestId(`option-${id}`).click()
  }

  await page.getByRole('button', { name: 'Submit' }).click()
  const nextBtn = page.getByRole('button', { name: 'Next' })
  await expect(nextBtn).toBeVisible()
  await nextBtn.click()
}

/**
 * Answer the current Trivia API question correctly: pick the option
 * carrying the fixture's correct answer, submit and (by default)
 * advance.
 *
 * Mirror of answerCorrectly for the fixture-driven trivia pool of
 * provider-switch.spec.ts (mockQuestions doesn't contain these
 * questions); the heading assertion pins the question before acting
 * on it.
 *
 * `next: false` on the run's last question — its Next stays disabled
 * while the failed survival batch opens the error dialog.
 */
export async function answerTriviaCorrectly(
  page: Page,
  fixture: { question: { text: string }; correctAnswer: string },
  { next = true }: { next?: boolean } = {},
) {
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(
    fixture.question.text,
  )
  await optionLocator(page).filter({ hasText: fixture.correctAnswer }).click()
  await page.getByRole('button', { name: 'Submit' }).click()

  if (next) {
    const nextBtn = page.getByRole('button', { name: 'Next' })
    await expect(nextBtn).toBeVisible()
    await nextBtn.click()
  }
}

// ── Results helpers ──────────────────────────────────────────────────────────

/**
 * Wait until the results page is loaded and ready.
 */
export async function waitForResults(page: Page) {
  await expect(page).toHaveURL(/\/results/)
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  return page
}

/**
 * Click "New Quiz" on the results page and wait for setup.
 */
export async function startNewQuiz(page: Page) {
  await page.getByRole('button', { name: 'New Quiz' }).click()
  await expect(page).toHaveURL(/\/setup/)
  await expect(
    page.getByRole('heading', { name: 'Quiz Settings' }),
  ).toBeVisible()
  return page
}
