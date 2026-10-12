/**
 * /setup — Quiz configuration screen.
 *
 * Allows selecting category, difficulty, question count, and mode,
 * then navigates to /quiz with the config as search params.
 *
 * Categories and difficulties are fetched from the QuizAPI at runtime
 * (metadata + categories endpoints) instead of being hardcoded.
 */

import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuizSessionStore } from '../../shared/lib/session-store'
import { useCategories, useMetadata } from '../../shared/api/quizapi'
import CategoryDropdown from '../../shared/ui/category-dropdown'
import DifficultySelector from '../../shared/ui/difficulty-selector'
import QuestionCountSlider from '../../shared/ui/question-count-slider'
import ModeSelector from '../../shared/ui/mode-selector'
import StartButton from '../../shared/ui/start-button'
import { MODE_IDS } from '../../features/modes'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map API difficulty (uppercase) → internal (lowercase). */
function apiDifficultyToInternal(apiDiff: string): 'easy' | 'medium' | 'hard' {
  const lower = apiDiff.toLowerCase() as 'easy' | 'medium' | 'hard'
  return lower
}

// Mode labels — derived from registry for i18n. Static, so hoisted to module
// level instead of being rebuilt on every render (rendering-hoist-jsx).
const MODE_LABELS = MODE_IDS.map((m) => ({
  value: m,
  labelKey:
    `setup.${m}` as `setup.${'classic' | 'timed' | 'blitz' | 'survival'}`,
}))

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SetupScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = useQuizSessionStore()

  const config = store.config

  // Fetch data from API
  const { data: metadata, isLoading: loadingMetadata } = useMetadata()
  const { data: categoriesData, isLoading: loadingCategories } = useCategories()

  const loading = loadingMetadata || loadingCategories

  // Build difficulties list from API
  const difficulties = (metadata?.difficulties ?? []).map((d) => {
    const value = apiDifficultyToInternal(d)
    return {
      value,
      labelKey: `setup.${value}` as `setup.${'easy' | 'medium' | 'hard'}`,
    }
  })

  const handleStart = () => {
    store.reset()
    navigate({
      to: '/quiz',
      search: {
        category: config.category,
        difficulty: config.difficulty,
        questionCount: config.questionCount,
        mode: config.mode,
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
            selectedCategory={config.category}
            onSelect={(cat) => store.updateConfig({ category: cat ?? 'all' })}
            loading={loading}
          />
        </div>

        {/* Difficulty */}
        <div className="group">
          <label className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default">
            {t('setup.difficulty')}
          </label>
          <DifficultySelector
            difficulties={difficulties}
            selectedDifficulty={config.difficulty}
            onSelect={(difficulty) => store.updateConfig({ difficulty })}
            loading={loading}
          />
        </div>

        {/* Question count — does not apply to survival (it loads the
            first batch of 10 and keeps batching until the API runs
            out), so the setting is hidden for that mode */}
        {config.mode !== 'survival' ? (
          <QuestionCountSlider
            value={config.questionCount}
            onChange={(count) => store.updateConfig({ questionCount: count })}
          />
        ) : null}

        {/* Mode */}
        <div className="group" data-testid="mode-selector">
          <label className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default">
            {t('setup.mode')}
          </label>
          <ModeSelector
            modes={MODE_LABELS}
            selectedMode={config.mode}
            onSelect={(mode) => store.updateConfig({ mode })}
          />
        </div>

        {/* Start button */}
        <StartButton loading={loading} onClick={handleStart} />
      </div>
    </div>
  )
}
