/**
 * /setup — Quiz configuration screen.
 *
 * Allows selecting category, difficulty, question count, and mode,
 * then navigates to /quiz with the config as search params.
 *
 * Categories and difficulties are fetched from the QuizAPI at runtime
 * (metadata + categories endpoints) instead of being hardcoded.
 */

import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuizSessionStore } from '../shared/lib/session-store'
import type { QuizMode } from '../shared/types/quiz'
import { useCategories, useMetadata } from '../shared/api/quizapi'

// ---------------------------------------------------------------------------
// Game modes — these are application logic, not API data
// ---------------------------------------------------------------------------

const MODES: { value: QuizMode; labelKey: string }[] = [
  { value: 'classic', labelKey: 'setup.classic' },
  { value: 'timed', labelKey: 'setup.timed' },
  { value: 'blitz', labelKey: 'setup.blitz' },
  { value: 'survival', labelKey: 'setup.survival' },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map API difficulty (uppercase) → internal (lowercase). */
function apiDifficultyToInternal(apiDiff: string): 'easy' | 'medium' | 'hard' {
  const lower = apiDiff.toLowerCase() as 'easy' | 'medium' | 'hard'
  return lower
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-lg bg-primary/10 ${className}`}
  />
)

const CategorySkeleton = () => (
  <Skeleton className="h-11 w-full" />
)

const DifficultySkeleton = () => (
  <div className="flex gap-2">
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-10 flex-1" />
    ))}
  </div>
)

// ---------------------------------------------------------------------------
// CategoryDropdown — standard <select> behavior, accordion inside
// ---------------------------------------------------------------------------

interface CategoryDropdownProps {
  topics: {
    id: string
    name: string
    slug: string
    categories: {
      id: string
      name: string
      slug: string
      quizCount?: number
    }[]
  }[]
  selectedCategory: string | null
  onSelect: (slug: string | null) => void
  loading?: boolean
}

const CategoryDropdown = ({
  topics,
  selectedCategory,
  onSelect,
  loading,
}: CategoryDropdownProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  if (loading) {
    return <CategorySkeleton />
  }

  // Find display text for collapsed state
  const displayText = selectedCategory
    ? (() => {
        for (const topic of topics) {
          const cat = topic.categories.find((c) => c.slug === selectedCategory)
          if (cat) return cat.name
        }
        return selectedCategory
      })()
    : t('common.category_all')

  const handleCategorySelect = (slug: string) => {
    onSelect(slug)
    setOpen(false)
  }

  const handleTopicToggle = (id: string) => {
    setExpandedTopicId(expandedTopicId === id ? null : id)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button (looks like a select) */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center gap-2 rounded-lg border-[3px] px-4 py-2.5 text-left text-sm font-bold transition-all cursor-pointer
          ${
            open
              ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary'
              : 'border-border bg-bg text-text hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]'
          }`}
      >
        <span className="flex-1 truncate">{displayText}</span>
        <span
          className={`text-xs text-text-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-xl transition-all animate-in">
          {/* "All" option at top */}
          <button
            type="button"
            onClick={() => {
              onSelect(null)
              setOpen(false)
            }}
            className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer
              ${
                selectedCategory === null
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-2 hover:bg-primary/5'
              }`}
          >
            <span>{t('common.all_categories')}</span>
          </button>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Topics as accordion inside dropdown */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {topics.map((topic) => {
              const isExpanded = expandedTopicId === topic.id

              return (
                <div key={topic.id}>
                  {/* Topic header */}
                  <button
                    type="button"
                    onClick={() => handleTopicToggle(topic.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-text-2 hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <span className="flex-1 text-left">{topic.name}</span>
                    <span
                      className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      ▼
                    </span>
                  </button>

                  {/* Categories */}
                  {isExpanded && (
                    <div className="px-3 pb-2 grid grid-cols-2 gap-1.5">
                      {topic.categories.map((cat) => {
                        const isSelected = selectedCategory === cat.slug

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySelect(cat.slug)}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer
                              ${
                                isSelected
                                  ? 'bg-primary/20 text-primary border-2 border-primary'
                                  : 'text-text-2 hover:bg-primary/5 hover:text-text border-2 border-transparent'
                              }`}
                          >
                            <span className="truncate">{cat.name}</span>
                            {cat.quizCount != null && (
                              <span className="ml-auto text-xs text-text-2/50 shrink-0">
                                {cat.quizCount}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SetupScreen = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = useQuizSessionStore()

  const [category, setCategory] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [questionCount, setQuestionCount] = useState(10)
  const [mode, setMode] = useState<QuizMode>('classic')

  // Fetch data from API
  const { data: metadata, isLoading: loadingMetadata } = useMetadata()
  const { data: categoriesData, isLoading: loadingCategories } = useCategories()

  const loading = loadingMetadata || loadingCategories

  // Build difficulties list from API
  const difficulties = (metadata?.difficulties ?? []).map((d) => ({
    value: apiDifficultyToInternal(d),
    labelKey: `setup.${d.toLowerCase()}` as const,
  }))

  const handleStart = () => {
    store.reset()
    navigate({
      to: '/quiz',
      search: {
        category: category ?? 'all',
        difficulty,
        questionCount,
        mode,
      },
    })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-text">
        {t('setup.title')}
      </h1>

      <div className="flex flex-col gap-6 rounded-xl bg-surface p-6 shadow-md transition-all hover:shadow-lg">
        {/* Category — custom dropdown */}
        <div className="group">
          <label className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default">
            {t('setup.category')}
          </label>
          <CategoryDropdown
            topics={categoriesData?.topics ?? []}
            selectedCategory={category}
            onSelect={setCategory}
            loading={loading}
          />
        </div>

        {/* Difficulty */}
        <div className="group">
          <label className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default">
            {t('setup.difficulty')}
          </label>
          {loading ? (
            <DifficultySkeleton />
          ) : (
            <div className="flex gap-2">
              {difficulties.map((d) => (
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
          )}
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
          disabled={loading}
          className={`mt-2 w-full rounded-lg bg-primary px-6 py-3 text-lg font-bold text-white shadow-md transition-all cursor-pointer
            ${
              loading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:shadow-md'
            }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t('setup.start')}
            </span>
          ) : (
            t('setup.start')
          )}
        </button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/setup')({
  component: SetupScreen,
})
