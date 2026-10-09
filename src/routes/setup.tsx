/**
 * /setup — Quiz configuration screen.
 *
 * Allows selecting category, difficulty, question count, and mode,
 * then navigates to /quiz with the config as search params.
 */

import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuizSessionStore } from '../shared/lib/session-store'
import type { QuizMode } from '../shared/types/quiz'

const CATEGORIES = [
  { value: 'all', labelKey: 'common.category_all' },
  { value: 'code', labelKey: 'category.code' },
  { value: 'science', labelKey: 'category.science' },
  { value: 'history', labelKey: 'category.history' },
  { value: 'geography', labelKey: 'category.geography' },
] as const

const DIFFICULTIES = [
  { value: 'easy' as const, labelKey: 'setup.easy' },
  { value: 'medium' as const, labelKey: 'setup.medium' },
  { value: 'hard' as const, labelKey: 'setup.hard' },
] as const

const MODES: { value: QuizMode; labelKey: string }[] = [
  { value: 'classic', labelKey: 'setup.classic' },
  { value: 'timed', labelKey: 'setup.timed' },
  { value: 'blitz', labelKey: 'setup.blitz' },
  { value: 'survival', labelKey: 'setup.survival' },
] as const

export const SetupScreen = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = useQuizSessionStore()

  const [category, setCategory] = useState('all')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [questionCount, setQuestionCount] = useState(10)
  const [mode, setMode] = useState<QuizMode>('classic')

  const handleStart = () => {
    store.reset()
    navigate({
      to: '/quiz',
      search: { category, difficulty, questionCount, mode },
    })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-text">
        {t('setup.title')}
      </h1>

      <div className="flex flex-col gap-6 rounded-xl bg-surface p-6 shadow-md">
        {/* Category */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-2">
            {t('setup.category')}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {t(c.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-2">
            {t('setup.difficulty')}
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors
                  ${
                    difficulty === d.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-bg text-text-2 hover:border-border/60'
                  }`}
              >
                {t(d.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-2">
            {t('setup.question_count')}
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1 text-center text-lg font-bold text-primary">
            {questionCount}
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-2">
            {t('setup.mode')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors
                  ${
                    mode === m.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-bg text-text-2 hover:border-border/60'
                  }`}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          type="button"
          onClick={handleStart}
          className="mt-2 rounded-lg bg-primary px-6 py-3 text-lg font-bold text-white shadow-md transition-colors hover:bg-primary/90"
        >
          {t('setup.start')}
        </button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/setup')({
  component: SetupScreen,
})
