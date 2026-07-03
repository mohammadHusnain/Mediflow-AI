/* eslint-disable react-refresh/only-export-components -- Shares form class helpers with route pages. */
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

export const surfaceClass =
  'rounded-card border border-hairline/70 bg-canvas shadow-card'

export const panelHeaderClass =
  'flex min-h-16 items-center justify-between gap-3 border-b border-hairline px-5 py-4'

export const emptyStateClass =
  'flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center'

export const translucentBackdropClass =
  'bg-canvas/75 backdrop-blur-sm animate-fade-in'

export const FORM_INPUT_CLASS =
  'w-full rounded-control border border-hairline bg-mist/50 px-4 py-2.5 text-[14px] font-normal text-ink outline-none transition-all duration-150 placeholder:text-slate/50 focus:border-brand focus:bg-canvas focus:ring-2 focus:ring-brand/25'

export function getFieldClass(error, extra = '') {
  return [
    FORM_INPUT_CLASS,
    extra,
    error ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-400/25' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function FieldError({ children, tone = 'error' }) {
  if (!children) {
    return null
  }

  const toneClass =
    tone === 'warning' ? 'text-amber-600' : 'text-rose-500'

  return (
    <p
      className={[
        'mt-1.5 flex animate-fade-up items-center gap-1 text-[12px] font-normal',
        toneClass,
      ].join(' ')}
    >
      <AlertCircle aria-hidden="true" className="h-[13px] w-[13px]" />
      {children}
    </p>
  )
}

export function RequiredCheck({ error = false }) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        error
          ? 'bg-rose-50 text-rose-600'
          : 'bg-brand-light text-brand',
      ].join(' ')}
    >
      <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
      Required
    </span>
  )
}

export function FieldLabel({ error, label, optional, required = !optional }) {
  return (
    <span
      className={[
        'mb-1.5 flex min-w-0 items-center justify-between gap-2 text-[13px] font-medium',
        error ? 'text-rose-500' : 'text-ink',
      ].join(' ')}
    >
      <span className="min-w-0 truncate">{label}</span>
      {optional ? (
        <span className="shrink-0 text-[12px] font-normal text-slate">
          optional
        </span>
      ) : required ? (
        <RequiredCheck error={Boolean(error)} />
      ) : null}
    </span>
  )
}

export function FormField({
  children,
  error,
  hint,
  label,
  optional,
  required = !optional,
}) {
  const normalizedError = String(error || '').trim().toLowerCase()
  const normalizedHint = String(hint || '').trim().toLowerCase()
  const showHint = Boolean(hint) && normalizedHint !== normalizedError

  return (
    <label className="block animate-fade-up">
      <FieldLabel
        error={error}
        label={label}
        optional={optional}
        required={required}
      />
      {children}
      {showHint ? (
        <p
          className={[
            'mt-1.5 text-[12px] font-normal italic',
            error ? 'text-rose-500' : 'text-slate/60',
          ].join(' ')}
        >
          {hint}
        </p>
      ) : null}
      <FieldError>{error}</FieldError>
    </label>
  )
}

export function FormSection({ children, optional, title }) {
  return (
    <section className="animate-fade-up">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-slate">
        <span>{title}</span>
        {optional ? (
          <span className="text-[11px] font-normal normal-case tracking-normal text-slate/70">
            optional
          </span>
        ) : null}
      </h2>
      <div className="mb-5 h-px bg-hairline" />
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

export function ErrorBanner({ message }) {
  if (!message) {
    return null
  }

  return (
    <div className="flex animate-fade-up items-start gap-2 rounded-control border border-rose-200 bg-rose-50 px-4 py-3">
      <XCircle
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
      />
      <p className="text-[13px] font-medium text-rose-700">{message}</p>
    </div>
  )
}

export function LoadingSpinner({ light = false }) {
  return (
    <span
      className={[
        'h-4 w-4 rounded-full border-2 animate-spin',
        light ? 'border-white/40 border-t-white' : 'border-brand/20 border-t-brand',
      ].join(' ')}
    />
  )
}
