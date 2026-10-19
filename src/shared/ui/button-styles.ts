/** Class recipes shared by <Button> and link-buttons. */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[translate,box-shadow,background-color,opacity] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  // Neumorphic: soft light/shade pair, lifts on hover, pressed-in on active.
  primary:
    'bg-primary text-on-primary shadow-neu hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-neu-lift active:translate-y-0.5 active:shadow-neu-inset disabled:hover:translate-y-0 disabled:hover:shadow-neu disabled:hover:bg-primary',
  secondary:
    'border-2 border-primary bg-bg text-primary-ink shadow-neu hover:-translate-y-0.5 hover:shadow-neu-lift active:translate-y-0.5 active:shadow-neu-inset disabled:hover:translate-y-0 disabled:hover:shadow-neu',
  ghost:
    'border border-transparent bg-bg text-text-2 shadow-neu hover:-translate-y-0.5 hover:shadow-neu-lift hover:text-text active:translate-y-0.5 active:shadow-neu-inset',
  danger:
    'bg-danger text-on-danger shadow-neu hover:bg-danger-hover hover:-translate-y-0.5 hover:shadow-neu-lift active:translate-y-0.5 active:shadow-neu-inset',
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
