/** Class recipe for one option of a segmented choice (raised / pressed-in). */
export function segmentClass(checked: boolean): string {
  const base =
    'rounded-tile border-2 px-3 py-2 text-body font-semibold transition-[box-shadow,color,border-color] cursor-pointer'
  return checked
    ? `${base} border-primary bg-bg text-primary-ink shadow-neu-inset`
    : `${base} border-transparent bg-bg text-text-2 shadow-neu hover:shadow-neu-lift hover:text-text`
}
