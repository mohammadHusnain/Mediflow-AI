const ALERT_META = {
  acknowledged: {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Acknowledged',
    pulse: false,
  },
  pending: {
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    label: 'Needs Call',
    pulse: true,
  },
  resolved: {
    className: 'border-green-200 bg-green-50 text-green-700',
    label: 'Resolved',
    pulse: false,
  },
}

export function CriticalAlertBadge({ status = 'pending' }) {
  const normalized = String(status || 'pending').toLowerCase()
  const meta = ALERT_META[normalized] || ALERT_META.pending

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

export default CriticalAlertBadge
