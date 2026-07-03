export function DarkTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="animate-scale-in rounded-card border border-white/10 bg-[#111827]/95 px-3.5 py-3 text-white shadow-[0_18px_46px_rgba(17,24,39,0.24)] backdrop-blur-md">
      {label ? (
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
          {label}
        </p>
      ) : null}
      <div className={label ? 'mt-2 space-y-1.5' : 'space-y-1.5'}>
        {payload.map((item, index) => (
          <div
            className="flex min-w-[150px] items-center justify-between gap-5"
            key={`${item.dataKey || item.name || 'value'}-${index}`}
          >
            <span className="inline-flex min-w-0 items-center gap-2 text-[12px] font-medium text-white/72">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color || item.stroke || item.fill || '#A5B4FC' }}
              />
              <span className="truncate">{item.name || item.dataKey}</span>
            </span>
            <span className="font-sans text-[13px] font-bold text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DarkTooltip
