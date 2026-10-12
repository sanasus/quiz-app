/**
 * Integration tests for the meta-layer hook: a finished session is
 * folded into stats, achievements and XP exactly once.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSessionMetrics } from './use-session-metrics'
import { useQuizSessionStore } from '../../shared/lib/session-store'
import { useStatsStore } from '../stats/stats-store'
import { useProgressStore } from '../progress/progress-store'
import { useAchievementsStore } from '../achievements/achievements-store'
import { STREAK_10 } from '../achievements/registry'
import type { Question } from '../../shared/types/quiz'

function makeQuestion(id: string): Question {
  return {
    id,
    text: `Question ${id}`,
    options: [
      { id: `${id}-a`, text: 'A' },
      { id: `${id}-b`, text: 'B' },
    ],
    correctOptionIds: [`${id}-a`],
    multiple: false,
    difficulty: 'easy',
    category: 'Code',
  }
}

beforeEach(() => {
  useQuizSessionStore.getState().reset()
  useStatsStore.getState().resetStats()
  useProgressStore.getState().resetProgress()
  useAchievementsStore.getState().resetAchievements()
})

describe('useSessionMetrics', () => {
  it('returns null without a finished session', () => {
    const { result } = renderHook(() => useSessionMetrics())
    expect(result.current).toBeNull()
  })

  it('records stats, awards XP and unlocks achievements once', () => {
    // Finished session: 2 correct of 2, streak of 10 (unlocks two
    // achievements: first_blood + streak_10).
    useQuizSessionStore.setState({
      status: 'finished',
      questions: [makeQuestion('q1'), makeQuestion('q2')],
      answers: { q1: ['q1-a'], q2: ['q2-a'] },
      bestStreak: STREAK_10,
      finishedSession: {
        score: 250,
        correctCount: 2,
        incorrectCount: 0,
        totalQuestions: 2,
        timeSpent: 30,
        bestStreak: STREAK_10,
        finishedAt: Date.UTC(2026, 0, 1, 12),
        mode: 'classic',
        difficulty: 'easy',
        category: 'Code',
        mistakes: [],
      },
    })

    const { result, rerender } = renderHook(() => useSessionMetrics())

    expect(result.current?.xpGained).toBe(25)
    expect(result.current?.newAchievements.map((a) => a.id).sort()).toEqual([
      'first_blood',
      'streak_10',
    ])

    // Stats folded in.
    expect(useStatsStore.getState().totalSessions).toBe(1)
    // XP persisted.
    expect(useProgressStore.getState().xp).toBe(25)
    // Achievements persisted with a date.
    const unlocked = useAchievementsStore.getState().unlocked
    expect(unlocked.first_blood).toBe('2026-01-01')
    expect(unlocked.streak_10).toBe('2026-01-01')

    // Re-render (remount scenario): nothing is counted twice.
    rerender()
    expect(useStatsStore.getState().totalSessions).toBe(1)
    expect(useProgressStore.getState().xp).toBe(25)
  })

  it('ignores an already-processed session on a fresh mount', () => {
    // Simulate: session was processed before, user navigated back.
    useQuizSessionStore.setState({
      status: 'finished',
      finishedSession: {
        score: 100,
        correctCount: 1,
        incorrectCount: 0,
        totalQuestions: 1,
        timeSpent: 10,
        bestStreak: 1,
        finishedAt: Date.UTC(2026, 0, 2, 12),
        mode: 'classic',
        difficulty: 'easy',
        category: 'Code',
        mistakes: [],
      },
    })

    // First mount processes it.
    renderHook(() => useSessionMetrics())
    expect(useStatsStore.getState().totalSessions).toBe(1)

    // Second mount must not re-process.
    const { result } = renderHook(() => useSessionMetrics())
    expect(result.current).toBeNull()
    expect(useStatsStore.getState().totalSessions).toBe(1)
    expect(useProgressStore.getState().xp).toBe(10)
  })

  it('processes repeat-mistakes sessions as new sessions', () => {
    const base = {
      status: 'finished' as const,
      questions: [makeQuestion('q1')],
      answers: { q1: ['q1-a'] },
      bestStreak: 1,
    }

    useQuizSessionStore.setState({
      ...base,
      finishedSession: {
        score: 100,
        correctCount: 1,
        incorrectCount: 0,
        totalQuestions: 1,
        timeSpent: 10,
        bestStreak: 1,
        finishedAt: Date.UTC(2026, 0, 3, 12),
        mode: 'classic',
        difficulty: 'easy',
        category: 'Code',
        mistakes: [],
      },
    })
    const first = renderHook(() => useSessionMetrics())
    expect(first.result.current?.xpGained).toBe(10)

    // Finish again (repeat session, new finishedAt).
    act(() => {
      useQuizSessionStore.setState({
        finishedSession: {
          score: 100,
          correctCount: 1,
          incorrectCount: 0,
          totalQuestions: 1,
          timeSpent: 5,
          bestStreak: 1,
          finishedAt: Date.UTC(2026, 0, 3, 13),
          mode: 'classic',
          difficulty: 'easy',
          category: 'Code',
          mistakes: [],
        },
      })
    })

    expect(useStatsStore.getState().totalSessions).toBe(2)
    expect(useProgressStore.getState().xp).toBe(20)
  })
})
