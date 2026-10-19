/** Class recipes shared by <Button> and link-buttons. */

export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-soft'
export type ButtonSize = 'sm' | 'md' | 'lg'

// Pill shape; depth comes from shadow alone (raised → lifted → pressed-in).
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[translate,box-shadow,background-color,color,opacity] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

const raised =
  'shadow-neu hover:-translate-y-0.5 hover:shadow-neu-lift active:translate-y-0 active:shadow-neu-inset disabled:hover:translate-y-0 disabled:hover:shadow-neu'

const variants: Record<ButtonVariant, string> = {
  // Accent fill (the reference's "Message" button).
  primary: `bg-primary text-on-primary hover:bg-primary-hover disabled:hover:bg-primary ${raised}`,
  // Neutral raised pills, coloured label.
  secondary: `bg-bg text-primary-ink ${raised}`,
  ghost: `bg-bg text-text-2 hover:text-text ${raised}`,
  danger: `bg-danger text-on-danger hover:bg-danger-hover ${raised}`,
  'danger-soft': `bg-bg text-danger-ink ${raised}`,
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-5 py-2 text-body',
  md: 'px-7 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg font-bold',
}

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim()
}
