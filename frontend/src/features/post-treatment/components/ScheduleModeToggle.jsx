const OPTIONS = [
  { label: 'Recurring Interval', value: 'interval' },
  { label: 'Custom Days', value: 'custom' },
]

export function ScheduleModeToggle({ onChange, value = 'interval' }) {
  return (
    <div className="inline-flex rounded-control border border-hairline bg-mist p-1">
      {OPTIONS.map((option) => {
        const active = value === option.value

        return (
          <button
            className={[
              'rounded-[7px] px-4 py-2 text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              active
                ? 'bg-canvas text-brand shadow-sm'
                : 'text-slate hover:bg-canvas/70 hover:text-ink',
            ].join(' ')}
            key={option.value}
            onClick={() => onChange?.(option.value)}
            type="button"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default ScheduleModeToggle
