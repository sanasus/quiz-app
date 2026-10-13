/**
 * SegmentedControl — a radiogroup styled as a row of chunky pills.
 *
 * Used by /settings for single-choice options (language, theme).
 */

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
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
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
            data-value={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 min-w-20 rounded-tile border-2 px-3 py-2 text-sm font-semibold transition-all cursor-pointer ${
              checked
                ? 'border-primary bg-primary/10 text-primary shadow-edge'
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
  const labelId = `${testId ?? 'toggle'}-label`
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={labelId} className="text-sm text-text-2">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={pressed}
        aria-labelledby={labelId}
        data-testid={testId}
        onClick={() => onChange(!pressed)}
        className={`relative h-8 w-16 rounded-pill border-2 transition-colors cursor-pointer ${
          pressed
            ? 'border-primary bg-primary/20'
            : 'border-border bg-surface hover:bg-surface-hover'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-6 w-6 rounded-full shadow transition-all ${
            pressed ? 'left-8 bg-primary' : 'left-0.5 bg-text-3'
          }`}
        />
        <span className="sr-only">{pressed ? onLabel : offLabel}</span>
      </button>
    </div>
  )
}
