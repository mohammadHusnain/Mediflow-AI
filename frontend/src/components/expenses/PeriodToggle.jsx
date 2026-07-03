import { EXPENSE_PERIODS } from './periods'

export function PeriodToggle({ onChange, value }) {
  return (
    <div className="inline-flex rounded-xl border border-hairline bg-mist p-1">
      {EXPENSE_PERIODS.map((period) => {
        const active = period.value === value

        return (
          <button
            className={[
              'rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all',
              active
                ? 'bg-canvas font-semibold text-ink shadow-sm'
                : 'text-slate hover:text-ink',
            ].join(' ')}
            key={period.value}
            onClick={() => onChange(period.value)}
            type="button"
          >
            {period.label}
          </button>
        )
      })}
    </div>
  )
}

export default PeriodToggle
