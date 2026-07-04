const ACCENT_CLASSES = {
  amber: 'bg-[#FEF3C7] text-[#B45309]',
  brand: 'bg-brand/10 text-brand',
  green: 'bg-[#E3F7EC] text-[#0F9D66]',
  red: 'bg-[#FCE4E8] text-[#C8102E]',
  slate: 'bg-mist text-slate',
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'number') {
    return value.toLocaleString()
  }

  return value
}

export default function StatCard({
  accentColor = 'brand',
  icon: Icon,
  label,
  loading = false,
  sub,
  value,
  valueColorClass = 'text-ink',
}) {
  const accentClass = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.brand

  return (
    <section className="flex items-start justify-between gap-4 rounded-[16px] border border-hairline bg-canvas p-6 shadow-card">
      <div className="min-w-0">
        <p className="mb-2 text-[13px] font-medium text-slate">{label}</p>
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-mist" />
        ) : (
          <p className={`truncate font-display text-[32px] leading-none ${valueColorClass}`}>
            {formatValue(value)}
          </p>
        )}
        {sub ? (
          <p className="mt-1 text-[12px] font-normal italic text-slate">{sub}</p>
        ) : null}
      </div>
      {Icon ? (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${accentClass}`}>
          <Icon aria-hidden="true" className="h-[22px] w-[22px]" />
        </div>
      ) : null}
    </section>
  )
}
