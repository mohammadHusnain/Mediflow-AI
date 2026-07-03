import { CURRENCIES } from '@shared/lib/currency'

export function CurrencySelectInline({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-[85px] shrink-0 rounded-control border border-hairline bg-canvas px-2 text-[12px] font-medium text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  )
}

export default CurrencySelectInline
