/** Class recipes shared by <Button> and link-buttons. */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[transform,box-shadow,background-color,opacity] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  // Hard bottom edge that collapses on press — the "game" button.
  primary:
    'bg-primary text-on-primary shadow-edge hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-edge-lift active:translate-y-1 active:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-edge disabled:hover:bg-primary',
  secondary:
    'border-2 border-primary text-primary-ink hover:bg-primary/10 disabled:hover:bg-transparent',
  ghost: 'border border-border-strong text-text-2 hover:bg-muted',
  danger:
    'bg-danger text-on-danger shadow-edge hover:bg-danger-hover hover:-translate-y-0.5 hover:shadow-edge-lift active:translate-y-1 active:shadow-none',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg font-bold',
}

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim()
}
