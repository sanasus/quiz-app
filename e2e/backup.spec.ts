import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
import { completeQuiz, startQuiz, waitForResults } from './fixtures'

async function playOneQuiz(page: Page) {
  await startQuiz(page, { difficulty: 'hard', questionCount: 2 })
  await completeQuiz(page, 2)
  await waitForResults(page)
}

async function sessionsPlayed(page: Page) {
  await page.getByRole('link', { name: 'Statistics' }).click()
  return page.getByTestId('stats-sessions')
}

test.describe('Backup and restore', () => {
  test('a downloaded backup restores the earlier progress', async ({
    page,
  }) => {
    await playOneQuiz(page)
    await page.getByRole('link', { name: 'Settings' }).click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download backup' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(
      /^quiz-app-backup-\d{4}-\d{2}-\d{2}\.json$/,
    )
    const backup = await readFile(await download.path())

    // More progress after the backup was taken…
    await playOneQuiz(page)
    await expect(await sessionsPlayed(page)).toHaveText('2')

    // …then restoring it brings back the state at backup time.
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.getByTestId('backup-file').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: backup,
    })
    const confirm = page.getByTestId('backup-restore-confirm')
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Replace' }).click()
    await expect(page.getByText('Backup restored')).toBeVisible()

    await expect(await sessionsPlayed(page)).toHaveText('1')
  })

  test('a file that is not a backup is rejected and nothing changes', async ({
    page,
  }) => {
    await playOneQuiz(page)
    await page.getByRole('link', { name: 'Settings' }).click()

    await page.getByTestId('backup-file').setInputFiles({
      name: 'nope.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello":"world"}'),
    })

    await expect(page.getByRole('alert')).toHaveText(
      'This is not a QuizApp backup.',
    )
    await expect(page.getByTestId('backup-restore-confirm')).toHaveCount(0)
    await expect(await sessionsPlayed(page)).toHaveText('1')
  })

  test('cancelling the confirmation keeps the current data', async ({
    page,
  }) => {
    await playOneQuiz(page)
    await page.getByRole('link', { name: 'Settings' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download backup' }).click()
    const backup = await readFile(await (await downloadPromise).path())

    await playOneQuiz(page)
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.getByTestId('backup-file').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: backup,
    })
    await page
      .getByTestId('backup-restore-confirm')
      .getByRole('button', { name: 'Cancel' })
      .click()

    await expect(await sessionsPlayed(page)).toHaveText('2')
  })
})
