import { beforeEach, describe, expect, it, vi } from 'vitest'

const track = vi.hoisted(() => vi.fn())
vi.mock('./analytics', () => ({ track }))

import { useProviderStore } from '../api/provider-store'
import { useQuizSessionStore } from '../lib/session-store'
import type { Question, QuizConfig } from '../types/quiz'
import {
  trackRunAbandoned,
  trackRunFinished,
  trackRunStarted,
} from './run-events'

const question = (id: string): Question => ({
  id,
  text: id,
  options: [
    { id: `${id}-a`, text: 'A' },
    { id: `${id}-b`, text: 'B' },
  ],
  correctOptionIds: [`${id}-a`],
  difficulty: 'easy',
})

const config: QuizConfig = {
  category: 'science',
  difficulty: 'hard',
  questionCount: 3,
  mode: 'blitz',
}

beforeEach(() => {
  track.mockClear()
  useProviderStore.setState({ providerId: 'trivia' })
  useQuizSessionStore.getState().reset()
  useQuizSessionStore
    .getState()
    .loadQuestions([question('q1'), question('q2'), question('q3')], config)
})

describe('run events', () => {
  it('quiz_started carries the run settings and the repeats flag', () => {
    trackRunStarted(true)

    expect(track).toHaveBeenCalledWith('quiz_started', {
      mode: 'blitz',
      difficulty: 'hard',
      category: 'science',
      provider: 'trivia',
      repeats: true,
    })
  })

  it('quiz_finished is not abandoned by default', () => {
    trackRunFinished({ correct: 2, total: 3, score: 250 })

    expect(track).toHaveBeenCalledWith(
      'quiz_finished',
      expect.objectContaining({
        abandoned: false,
        correct: 2,
        total: 3,
        score: 250,
      }),
    )
  })

  it('an abandoned run counts only the questions answered so far', () => {
    useQuizSessionStore.setState({
      status: 'answered',
      currentIndex: 1,
      answers: { q1: ['q1-a'], q2: ['q2-b'] },
      score: 100,
    })

    trackRunAbandoned()

    expect(track).toHaveBeenCalledWith(
      'quiz_finished',
      expect.objectContaining({
        abandoned: true,
        correct: 1,
        total: 2,
        score: 100,
      }),
    )
  })

  it('the question on screen is not counted before it is answered', () => {
    useQuizSessionStore.setState({
      status: 'playing',
      currentIndex: 1,
      answers: { q1: ['q1-a'] },
    })

    trackRunAbandoned()

    expect(track).toHaveBeenCalledWith(
      'quiz_finished',
      expect.objectContaining({ abandoned: true, correct: 1, total: 1 }),
    )
  })

  it('nothing is reported when there is no run to abandon', () => {
    useQuizSessionStore.getState().reset()

    trackRunAbandoned()

    expect(track).not.toHaveBeenCalled()
  })
})
