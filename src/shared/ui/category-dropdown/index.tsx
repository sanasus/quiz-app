/**
 * CategoryDropdown — custom dropdown with accordion topics.
 *
 * Displays categories grouped by topic, with "All categories" at the top.
 * Uses a composite slug format: `${topicSlug}/${categorySlug}` for the selected value.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CategorySkeleton } from '../skeletons'
import { ChevronDown } from 'lucide-react'

export interface CategoryDropdownTopic {
  id: string
  name: string
  slug: string
  categories: {
    id: string
    name: string
    slug: string
    quizCount?: number
  }[]
}

export interface CategoryDropdownProps {
  topics: CategoryDropdownTopic[]
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
  const displayText =
    selectedCategory === 'all'
      ? t('common.category_all')
      : (() => {
          for (const topic of topics) {
            const cat = topic.categories.find(
              (c) => c.slug === selectedCategory,
            )
            if (cat) return cat.name
          }
          return selectedCategory ?? t('common.category_all')
        })()

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
        data-testid="category-dropdown"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="category-label category-value"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center gap-2 rounded-lg border-[3px] px-4 py-2.5 text-left text-sm font-bold transition-colors cursor-pointer
          ${
            open
              ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary-ink'
              : 'border-border bg-bg text-text hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]'
          }`}
      >
        <span id="category-value" className="flex-1 truncate">
          {displayText}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-text-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-xl animate-in">
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
                  ? 'bg-primary/10 text-primary-ink'
                  : 'text-text-2 hover:bg-primary/5'
              }`}
          >
            <span>{t('common.all_categories')}</span>
          </button>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Topics as accordion inside dropdown */}
          <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
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
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
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
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer
                              ${
                                isSelected
                                  ? 'bg-primary/20 text-primary-ink border-2 border-primary'
                                  : 'text-text-2 hover:bg-primary/5 hover:text-text border-2 border-transparent'
                              }`}
                          >
                            <span className="truncate">{cat.name}</span>
                            {cat.quizCount != null && (
                              <span className="ml-auto text-xs text-text-3 shrink-0">
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

export default CategoryDropdown
