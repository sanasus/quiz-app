/**
 * SegmentedControl — a radiogroup styled as a row of chunky pills.
 *
 * Used by /settings for single-choice options (language, theme).
 */

import type { KeyboardEvent } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Optional leading emoji, decorative. */
  icon?: string
}

export interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group (i18n key is passed pre-translated). */
  label: string
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  testId?: string
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  testId,
}: SegmentedControlProps<T>) {
  // Roving tabindex: one stop for the group, arrow keys move selection
  // (WAI-ARIA radiogroup pattern).
  const move = (delta: number) => {
    const index = options.findIndex((o) => o.value === value)
    const next = (index + delta + options.length) % options.length
    const target = options[next]
    if (target) onChange(target.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        move(1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        event.preventDefault()
        if (options[0]) onChange(options[0].value)
        break
      case 'End': {
        event.preventDefault()
        const last = options[options.length - 1]
        if (last) onChange(last.value)
        break
      }
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      onKeyDown={handleKeyDown}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-value={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 min-w-20 rounded-tile border-2 px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              checked
                ? 'border-primary bg-primary/10 text-primary-ink shadow-edge'
                : 'border-border bg-surface text-text-2 hover:bg-surface-hover hover:text-text'
            }`}
          >
            {option.icon ? (
              <span aria-hidden="true" className="mr-1">
                {option.icon}
              </span>
            ) : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Toggle — a single on/off switch rendered as a pressed button
 * (aria-pressed, not a radiogroup: it is a boolean, not a choice).
 */
export interface ToggleProps {
  label: string
  pressed: boolean
  onChange: (pressed: boolean) => void
  onLabel: string
  offLabel: string
  testId?: string
}

export function Toggle({
  label,
  pressed,
  onChange,
  onLabel,
  offLabel,
  testId,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      data-testid={testId}
      onClick={() => onChange(!pressed)}
      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-tile border-2 border-transparent py-1 text-left transition-colors ${
        pressed ? 'border-primary/40 bg-primary/5' : 'hover:bg-surface-hover'
      }`}
    >
      <span className="text-sm text-text-2">{label}</span>
      <span
        className={`relative block h-8 w-16 shrink-0 rounded-pill border-2 transition-colors ${
          pressed ? 'border-primary bg-primary/20' : 'border-border bg-surface'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-6 w-6 rounded-full shadow transition-[left,background-color] ${
            pressed ? 'left-8 bg-primary' : 'left-0.5 bg-text-3'
          }`}
        />
      </span>
      <span className="sr-only">{pressed ? onLabel : offLabel}</span>
    </button>
  )
}
