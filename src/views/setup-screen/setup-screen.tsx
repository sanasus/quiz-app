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
import { isDifficulty } from '../../shared/lib/difficulties'
import { useCatalog } from '../../shared/api/quizapi'
import CategoryDropdown from '../../shared/ui/category-dropdown'
import DifficultySelector, {
  type DifficultyOption,
} from '../../shared/ui/difficulty-selector'
import QuestionCountSlider from '../../shared/ui/question-count-slider'
import ModeSelector from '../../shared/ui/mode-selector'
import StartButton from '../../shared/ui/start-button'
import { AppToast } from '../../shared/ui/app-toast'
import { MODE_IDS } from '../../features/modes'
import { useProviderFallback } from './hooks/use-provider-fallback'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  // Fetch the difficulty levels and the category tree — one request,
  // since the proxy merges the two upstream calls server-side.
  const {
    data: catalog,
    isLoading: loading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useCatalog()

  // Broken provider → auto-switch + toast; network failure → inline
  // error with Retry (see the hook for the full policy).
  const { inlineError, toast, dismissToast, retry } = useProviderFallback({
    catalogError,
    refetchCatalog,
  })

  // Build the difficulties list, keeping only the levels the internal
  // model supports end to end. The proxy already drops EXPERT, but the
  // mock provider serves raw values ('EASY', …, 'EXPERT') without going
  // through it — filtered out here instead of rendering a button that
  // could never start a quiz (see README «Ограничения»).
  const difficulties = (catalog?.difficulties ?? [])
    .map((d) => d.toLowerCase())
    .filter(isDifficulty)
    .map((value): DifficultyOption => ({
      value,
      labelKey: `setup.${value}`,
    }))

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

      <div className="flex flex-col gap-6 rounded-xl bg-surface p-6 shadow-md transition-shadow hover:shadow-lg">
        {/* Category — custom dropdown */}
        <div className="group">
          <label
            id="category-label"
            className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default"
          >
            {t('setup.category')}
          </label>
          <CategoryDropdown
            topics={catalog?.topics ?? []}
            selectedCategory={config.category}
            onSelect={(cat) => store.updateConfig({ category: cat ?? 'all' })}
            loading={loading}
          />
        </div>

        {/* Difficulty */}
        <div className="group" role="group" aria-labelledby="difficulty-label">
          <label
            id="difficulty-label"
            className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default"
          >
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
        <div
          className="group"
          data-testid="mode-selector"
          role="group"
          aria-labelledby="mode-label"
        >
          <label
            id="mode-label"
            className="mb-2 block text-sm font-medium text-text-2 group-hover:text-primary transition-colors cursor-default"
          >
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

      {/* A failed setup fetch the auto-switch doesn't handle (user's
          network, or the fallback provider failing too). */}
      {inlineError ? (
        <div
          role="alert"
          className="mt-6 flex flex-col gap-3 rounded-lg border border-danger bg-danger/10 p-4"
        >
          <p className="text-danger-ink">{t('setup.load_error')}</p>
          <p className="break-words text-xs text-text-2">{inlineError}</p>
          <button
            type="button"
            onClick={retry}
            className="self-start rounded-lg bg-primary px-4 py-2 text-on-primary"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      {toast ? (
        <AppToast
          title={toast.title}
          message={toast.message}
          onDismiss={dismissToast}
        />
      ) : null}
    </div>
  )
}
