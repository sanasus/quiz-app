import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../app/i18n'
import { useSettingsStore } from '../app/settings-store'
import { useAchievementsStore } from '../features/achievements/achievements-store'
import { useProgressStore } from '../features/progress/progress-store'
import { useStatsStore } from '../features/stats/stats-store'
import { useQuizSessionStore } from '../shared/lib/session-store'
import type { Question, SessionResult } from '../shared/types/quiz'

const navigateMock = vi.hoisted(() => vi.fn())
const shareMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))
// Canvas is not available in jsdom; the card itself has its own tests.
vi.mock('../features/share/use-share-card', () => ({
  useShareCard: () => ({ ready: true, failed: false, share: shareMock }),
}))
vi.mock('../shared/analytics/analytics', () => ({ track: vi.fn() }))
vi.mock('../shared/ui/confetti', () => ({ Confetti: () => null }))

import { ResultsScreen } from './results-screen'

const question = (id: string, explanation?: string): Question => ({
  id,
  text: `Question ${id}`,
  options: [
    { id: `${id}-a`, text: `Right ${id}` },
    { id: `${id}-b`, text: `Wrong ${id}` },
  ],
  correctOptionIds: [`${id}-a`],
  difficulty: 'easy',
  explanation,
})

function makeResult(overrides: Partial<SessionResult> = {}): SessionResult {
  const q1 = question('q1')
  const q2 = question('q2', 'Because it is.')
  return {
    score: 150,
    correctCount: 1,
    incorrectCount: 1,
    totalQuestions: 2,
    timeSpent: 75,
    bestStreak: 1,
    finishedAt: Date.UTC(2026, 0, 1, 12),
    mode: 'classic',
    difficulty: 'easy',
    category: 'all',
    attempts: [
      { question: q1, selectedOptionIds: ['q1-a'], correct: true },
      { question: q2, selectedOptionIds: ['q2-b'], correct: false },
    ],
    livesLeft: 3,
    ...overrides,
  }
}

function seedFinished(result: SessionResult) {
  useQuizSessionStore.setState({
    status: 'finished',
    finishedSession: result,
  })
}

function renderResults() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ResultsScreen />
    </I18nextProvider>,
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  navigateMock.mockClear()
  // Counters show their final value at once.
  useSettingsStore.setState({ animations: false })
  shareMock.mockReset()
  localStorage.clear()
  useStatsStore.getState().resetStats()
  useProgressStore.getState().resetProgress()
  useAchievementsStore.getState().resetAchievements()
  useQuizSessionStore.getState().reset()
})

describe('ResultsScreen', () => {
  it('renders nothing without a finished session', () => {
    const { container } = renderResults()

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the summary metrics', () => {
    seedFinished(makeResult())
    renderResults()

    expect(screen.getByTestId('result-correct')).toHaveTextContent('1')
    expect(screen.getByTestId('result-incorrect')).toHaveTextContent('1')
    expect(screen.getByTestId('result-accuracy')).toHaveTextContent('50%')
    expect(screen.getByTestId('result-time')).toHaveTextContent('1:15')
  })

  it('awards XP once for the session', () => {
    seedFinished(makeResult())
    renderResults()

    expect(screen.getByTestId('result-xp')).toHaveTextContent('+15 XP')
    expect(useProgressStore.getState().xp).toBe(15)
  })

  it('opens the review on the mistakes, with the right answer and explanation', () => {
    seedFinished(makeResult())
    renderResults()

    const review = screen.getByRole('list')
    expect(within(review).getAllByRole('listitem')).toHaveLength(1)
    expect(within(review).getByText('❌ Wrong q2')).toBeInTheDocument()
    expect(within(review).getByText('✅ Right q2')).toBeInTheDocument()
    expect(within(review).getByText('Because it is.')).toBeInTheDocument()
  })

  it('the All filter adds the correct answers', async () => {
    seedFinished(makeResult())
    renderResults()

    await userEvent.click(screen.getByRole('radio', { name: /^All/ }))

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('✅ Right q1')).toBeInTheDocument()
  })

  it('opens on everything and has no filter after a perfect run', () => {
    const result = makeResult({ correctCount: 2, incorrectCount: 0 })
    result.attempts = result.attempts.map((a) => ({
      ...a,
      selectedOptionIds: a.question.correctOptionIds,
      correct: true,
    }))
    seedFinished(result)
    renderResults()

    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('says "No answer" for a question that timed out', () => {
    const result = makeResult()
    result.attempts[1] = { ...result.attempts[1], selectedOptionIds: [] }
    seedFinished(result)
    renderResults()

    expect(screen.getByText('❌ No answer')).toBeInTheDocument()
  })

  it('announces a newly unlocked achievement', () => {
    seedFinished(makeResult())
    renderResults()

    // First finished session unlocks "First Blood".
    expect(screen.getByText('First Blood')).toBeInTheDocument()
    expect(useAchievementsStore.getState().unlocked).toHaveProperty(
      'first_blood',
    )
  })

  it('New Quiz resets the session and goes to setup', async () => {
    seedFinished(makeResult())
    renderResults()

    await userEvent.click(screen.getByRole('button', { name: 'New Quiz' }))

    expect(useQuizSessionStore.getState().status).toBe('idle')
    expect(navigateMock).toHaveBeenCalledWith({ to: '/setup' })
  })

  it('shares the pre-rendered card and confirms it', async () => {
    shareMock.mockResolvedValue('shared')
    seedFinished(makeResult())
    renderResults()

    await userEvent.click(screen.getByRole('button', { name: 'Share result' }))

    expect(shareMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Result shared')).toBeInTheDocument()
  })

  it('stays quiet when the share sheet is dismissed', async () => {
    shareMock.mockResolvedValue('cancelled')
    seedFinished(makeResult())
    renderResults()

    await userEvent.click(screen.getByRole('button', { name: 'Share result' }))

    expect(screen.queryByText('Result shared')).toBeNull()
    expect(screen.queryByText("Couldn't share the result")).toBeNull()
  })

  it('reports a failed share', async () => {
    shareMock.mockRejectedValue(new Error('boom'))
    seedFinished(makeResult())
    renderResults()

    await userEvent.click(screen.getByRole('button', { name: 'Share result' }))

    expect(
      await screen.findByText("Couldn't share the result"),
    ).toBeInTheDocument()
  })
})
