const PLAN_META = {
  active: {
    className: 'border-brand/20 bg-brand-light text-brand',
    label: 'Active',
    pulse: true,
  },
  cancelled: {
    className: 'border-slate-200 bg-slate-100 text-slate-500',
    label: 'Cancelled',
    pulse: false,
  },
  completed: {
    className: 'border-green-200 bg-green-50 text-green-700',
    label: 'Completed',
    pulse: false,
  },
}

export function PlanStatusBadge({ status = 'active' }) {
  const normalized = String(status || 'active').toLowerCase()
  const meta = PLAN_META[normalized] || PLAN_META.active

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-wide',
        meta.className,
      ].join(' ')}
    >
      {meta.pulse ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-brand" />
      ) : null}
      {meta.label}
    </span>
  )
}

export default PlanStatusBadge
