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
import { Card } from '../card'

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
        className={`flex w-full items-center gap-2 rounded-tile border-2 bg-bg px-4 py-2.5 text-left text-body font-bold transition-[box-shadow,color,border-color] cursor-pointer ${
          open
            ? 'border-primary text-primary-ink shadow-neu-inset'
            : 'border-transparent text-text shadow-neu hover:shadow-neu-lift'
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
        <Card padding="none" className="absolute z-50 mt-1 w-full animate-in">
          {/* "All" option at top */}
          <button
            type="button"
            onClick={() => {
              onSelect(null)
              setOpen(false)
            }}
            className={`m-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-tile border-2 px-4 py-2 text-body font-bold transition-[box-shadow,color,border-color] cursor-pointer ${
              selectedCategory === null || selectedCategory === 'all'
                ? 'border-primary text-primary-ink shadow-neu-inset'
                : 'border-transparent text-text-2 hover:text-text hover:shadow-neu'
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
                    className="flex w-full items-center gap-2 rounded-tile px-3 py-2 text-body font-bold text-text-2 transition-[box-shadow,color] cursor-pointer hover:text-text hover:shadow-neu"
                  >
                    <span className="flex-1 text-left">{topic.name}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Categories */}
                  {isExpanded && (
                    <div className="grid grid-cols-2 gap-3 px-2 pb-4 pt-3">
                      {topic.categories.map((cat) => {
                        const isSelected = selectedCategory === cat.slug

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySelect(cat.slug)}
                            className={`flex items-center gap-2 rounded-tile border-2 px-3 py-2 text-body font-medium transition-[box-shadow,color,border-color] cursor-pointer ${
                              isSelected
                                ? 'border-primary text-primary-ink shadow-neu-inset'
                                : 'border-transparent text-text-2 shadow-neu hover:text-text hover:shadow-neu-lift'
                            }`}
                          >
                            <span className="truncate">{cat.name}</span>
                            {cat.quizCount != null && (
                              <span className="ml-auto text-caption text-text-3 shrink-0">
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
        </Card>
      )}
    </div>
  )
}

export default CategoryDropdown
