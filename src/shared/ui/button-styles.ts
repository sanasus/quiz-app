/** Class recipes shared by <Button> and link-buttons. */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[box-shadow,background-color,opacity] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  // Material: the button floats; hover raises it, press brings it back down.
  primary:
    'bg-primary text-on-primary shadow-elev-2 hover:bg-primary-hover hover:shadow-elev-6 active:shadow-elev-1 disabled:shadow-none disabled:hover:bg-primary',
  // Outlined buttons stay flat; hover/press show a state tint instead.
  secondary:
    'border-2 border-primary text-primary-ink hover:bg-primary/10 active:bg-primary/20',
  ghost:
    'border border-border-strong text-text-2 hover:bg-muted hover:text-text active:bg-bg-3',
  danger:
    'bg-danger text-on-danger shadow-elev-2 hover:bg-danger-hover hover:shadow-elev-6 active:shadow-elev-1 disabled:shadow-none',
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
