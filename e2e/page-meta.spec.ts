import { test, expect } from '@playwright/test'

test.describe('Page meta', () => {
  test(
    'the tab title follows the route',
    { tag: ['@smoke'] },
    async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveTitle('QuizApp')

      await page.getByRole('link', { name: 'Settings' }).click()
      await expect(page).toHaveTitle('Settings · QuizApp')

      await page.getByRole('link', { name: 'Achievements' }).click()
      await expect(page).toHaveTitle('Achievements · QuizApp')
    },
  )

  test('the tab title follows the language', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveTitle('Settings · QuizApp')

    await page.getByTestId('lang-toggle').click()
    await expect(page).toHaveTitle('Настройки · QuizApp')
  })

  test('static Open Graph tags are in the served HTML', async ({ request }) => {
    const html = await (await request.get('/')).text()

    expect(html).toContain('property="og:title"')
    expect(html).toMatch(
      /property="og:image"\s+content="https:\/\/[^"]+\/og-image\.png"/,
    )
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('name="description"')
  })
})
