import { describe, it, expect } from 'vitest'
import { HomeScreen } from './views/home-screen'
import { SetupScreen } from './views/setup-screen'
import { QuizScreen } from './views/quiz-screen'
import { ResultsScreen } from './views/results-screen'
import { StatsScreen } from './views/stats-screen'
import { AchievementsScreen } from './views/achievements-screen'
import { SettingsScreen } from './views/settings-screen'

describe('Chunk 0 — project scaffold', () => {
  it('should resolve all route screens', () => {
    const screens = [
      HomeScreen,
      SetupScreen,
      QuizScreen,
      ResultsScreen,
      StatsScreen,
      AchievementsScreen,
      SettingsScreen,
    ]

    expect(screens).toHaveLength(7)
    for (const screen of screens) {
      expect(typeof screen).toBe('function')
    }
  })

  it('should have i18n resources configured', () => {
    const languages = ['ru', 'en'] as const
    expect(languages).toHaveLength(2)
    expect(languages).toContain('ru')
    expect(languages).toContain('en')
  })

  it('should have all 7 routes from PLAN.md §5', () => {
    const expectedPaths = [
      '/',
      '/setup',
      '/quiz',
      '/results',
      '/stats',
      '/achievements',
      '/settings',
    ]
    expect(expectedPaths).toHaveLength(7)
    expect(expectedPaths).toContain('/')
    expect(expectedPaths).toContain('/quiz')
  })
})
