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

      <div className="flex flex-col gap-6 rounded-xl bg-surface p-6 shadow-md transition-all hover:shadow-lg">
        {/* Category */}
        <div className="group">
          <label className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default">
            {t('setup.category')}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border-border bg-surface px-3 py-2 text-text hover:border-primary/50 hover:bg-primary/5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-surface text-text">
                {t(c.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="group">
          <label className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default">
            {t('setup.difficulty')}
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={`flex-1 rounded-lg border-[3px] px-3 py-2 text-sm font-bold transition-all
                  ${
                    difficulty === d.value
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/20 text-primary scale-[1.03] cursor-pointer'
                      : 'border-border bg-bg text-text-2 hover:border-primary/50 hover:bg-primary/5 hover:text-text cursor-pointer active:scale-[0.98]'
                  }`}
              >
                {t(d.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div className="group">
          <label className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default">
            {t('setup.question_count')}
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full accent-primary hover:accent-primary-active cursor-pointer"
          />
          <div className="mt-1 text-center text-lg font-bold text-primary">
            {questionCount}
          </div>
        </div>

        {/* Mode */}
        <div className="group">
          <label className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default">
            {t('setup.mode')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`flex-1 rounded-lg border-[3px] px-3 py-2 text-sm font-bold transition-all
                  ${
                    mode === m.value
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/20 text-primary scale-[1.03] cursor-pointer'
                      : 'border-border bg-bg text-text-2 hover:border-primary/50 hover:bg-primary/5 hover:text-text cursor-pointer active:scale-[0.98]'
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
          className="mt-2 w-full rounded-lg bg-primary px-6 py-3 text-lg font-bold text-white shadow-md transition-all hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:shadow-md cursor-pointer"
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
