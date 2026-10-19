import { test, expect } from '@playwright/test'
import {
  abortTrivia,
  routeQuizApi,
  routeTrivia,
  triviaQuestions,
} from './api-fixtures'
import {
  answerTriviaCorrectly,
  selectCategory,
  selectMode,
  selectProvider,
  startFromCurrentSetup,
} from './fixtures'

/**
 * Provider switching e2e — policy matrix in docs/providers.md.
 *
 * The dev server runs with VITE_USE_MOCK_DATA=true: every page load
 * re-forces providerId to 'mock', so each scenario starts with
 * page.goto() and then switches providers through client-side
 * navigation only — no goto/reload after the switch.
 */
test.describe('Provider switching', () => {
  test(
    'switches to The Trivia API from settings',
    { tag: ['@smoke'] },
    async ({ page }) => {
      await page.goto('/setup')
      await routeTrivia(page)

      // Seed a concrete category under the mock provider: category
      // slugs are provider-specific, so the switch must drop the old
      // choice (regression: a leftover slug the new provider lacks).
      await selectCategory(page, 'Science', 'Physics')
      const dropdown = page.getByTestId('category-dropdown')
      await expect(dropdown).toContainText('Physics')

      // SPA navigation only — a reload would re-force providerId.
      await page.getByRole('link', { name: 'Settings' }).click()
      await expect(page).toHaveURL(/\/settings/)

      // No active session → no confirmation dialog, straight to /setup.
      await selectProvider(page, 'The Trivia API')
      await expect(page.getByTestId('provider-switch-confirm')).toHaveCount(0)

      // The seeded category is gone — back to the default "All".
      await expect(dropdown).toContainText('All')

      // Setup data comes from the proxy fixtures: difficulties and the
      // category tree in one catalog response.
      await expect(page.getByTestId('difficulty-easy')).toBeVisible()
      await dropdown.click()
      await page.getByRole('button', { name: /The Trivia API/ }).click()
      await expect(
        page.getByRole('button', { name: /General Knowledge/ }),
      ).toBeVisible()

      // Footer attribution (T9): both links point at their sources.
      const footer = page.getByRole('contentinfo')
      await expect(footer).toContainText(
        'Powered by The Trivia API (CC BY-NC 4.0)',
      )
      await expect(
        footer.getByRole('link', { name: 'CC BY-NC 4.0' }),
      ).toHaveAttribute(
        'href',
        'https://creativecommons.org/licenses/by-nc/4.0/',
      )
      await expect(
        footer.getByRole('link', { name: 'The Trivia API' }),
      ).toHaveAttribute('href', 'https://the-trivia-api.com')
    },
  )

  test('opens the dialog when questions fail on quiz start', async ({
    page,
  }) => {
    let questionRequests = 0
    await page.goto('/settings')
    await routeQuizApi(page, {
      failQuestions: true,
      onQuestionsRequest: () => {
        questionRequests += 1
      },
    })
    // After Change API the provider becomes trivia — /setup must load.
    await routeTrivia(page)

    await selectProvider(page, 'QuizAPI')
    await startFromCurrentSetup(page)

    // The initial question fetch fails → error dialog with no
    // dismissal path other than its two actions.
    const dialog = page.getByRole('alertdialog')
    await expect(
      dialog.getByRole('heading', { name: 'Question source unavailable' }),
    ).toBeVisible()

    // Retry refires the request for real, the dialog survives it.
    const requestsBeforeRetry = questionRequests
    await page.getByTestId('api-error-retry').click()
    await expect
      .poll(() => questionRequests)
      .toBeGreaterThan(requestsBeforeRetry)
    await expect(dialog).toBeVisible()

    // Change API switches provider and returns to setup.
    await page.getByTestId('api-error-change').click()
    await expect(page).toHaveURL(/\/setup/)
    await expect(page.getByRole('contentinfo')).toContainText(
      'Powered by The Trivia API (CC BY-NC 4.0)',
    )
  })

  test('opens the dialog when a survival batch fails', async ({ page }) => {
    await page.goto('/settings')
    await routeTrivia(page, { failBatchOffset: true })
    // Change API toggles trivia → quizapi; /setup loads cleanly there.
    await routeQuizApi(page)

    await selectProvider(page, 'The Trivia API')
    await selectMode(page, 'survival')
    await startFromCurrentSetup(page)

    // The first batch (offset=0) loads from the fixtures: 3 questions.
    await expect(
      page.getByRole('heading', { name: 'Question 1/3', exact: true }),
    ).toBeVisible()

    await answerTriviaCorrectly(page, triviaQuestions[0])
    await answerTriviaCorrectly(page, triviaQuestions[1])
    // The next batch (offset=3) already failed; answering the last
    // loaded question opens the dialog instead of Next.
    await answerTriviaCorrectly(page, triviaQuestions[2], { next: false })

    const dialog = page.getByRole('alertdialog')
    await expect(
      dialog.getByRole('heading', { name: 'Question source unavailable' }),
    ).toBeVisible()

    await page.getByTestId('api-error-change').click()
    await expect(page).toHaveURL(/\/setup/)
    await expect(page.getByRole('contentinfo')).toContainText(
      'Powered by QuizAPI',
    )
  })

  test('auto-switches on setup with a single toast', async ({ page }) => {
    await page.goto('/settings')
    await routeQuizApi(page, { failAll: true })
    await routeTrivia(page)

    await selectProvider(page, 'QuizAPI')

    // A fully broken provider fails fast (`http` is not retryable) and
    // the setup screen falls back to the other provider with a toast.
    const toast = page.getByRole('status')
    await expect(toast).toContainText('Question source changed', {
      timeout: 15_000,
    })
    await expect(toast).toContainText('Now using The Trivia API')

    // Categories and difficulties now come from the trivia fixtures.
    await expect(page.getByTestId('category-dropdown')).toBeVisible()
    await expect(page.getByTestId('difficulty-easy')).toBeVisible()
    await expect(page.getByRole('link', { name: 'CC BY-NC 4.0' })).toBeVisible()

    // Exactly one toast: it dismisses itself and never comes back.
    await expect(toast).toHaveCount(1)
    await expect(toast).toHaveCount(0, { timeout: 10_000 })

    // The provider stayed on trivia after the toast cycle.
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(
      page
        .getByTestId('provider-selector')
        .getByRole('radio', { name: 'The Trivia API' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  test('keeps the provider on a network failure', async ({ page }) => {
    await page.goto('/settings')
    await abortTrivia(page)
    // Never let a stray QuizAPI request reach the real network.
    await routeQuizApi(page)

    await selectProvider(page, 'The Trivia API')

    // Network failures never switch: an inline alert with Retry
    // instead (retries add ~3s before the error settles).
    const alert = page.getByRole('alert')
    await expect(alert).toContainText(
      'Failed to load categories and difficulties. Check your connection.',
      { timeout: 15_000 },
    )
    await expect(page.getByRole('status')).toHaveCount(0)
    // Provider unchanged: the footer still shows the trivia attribution.
    await expect(page.getByRole('contentinfo')).toContainText(
      'Powered by The Trivia API (CC BY-NC 4.0)',
    )

    // Retry keeps failing → the alert stays, still no toast.
    await alert.getByRole('button', { name: 'Retry' }).click()
    await expect(alert).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})
