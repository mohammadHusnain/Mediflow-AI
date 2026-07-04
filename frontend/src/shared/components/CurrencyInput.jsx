import { CURRENCIES, getStoredCurrency } from '@shared/lib/currency'

export default function CurrencyInput({ currency, onCurrencyChange, ...inputProps }) {
  const currentCurrency = currency || getStoredCurrency()

  return (
    <div className="flex gap-2">
      <select
        className="h-11 w-[75px] shrink-0 rounded-control border border-hairline bg-canvas px-1.5 text-[11px] font-medium text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
        value={currentCurrency}
        onChange={(e) => onCurrencyChange && onCurrencyChange(e.target.value)}
      >
        {CURRENCIES.slice(0, 12).map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </option>
        ))}
      </select>
      <input {...inputProps} className={`${inputProps.className || ''} flex-1`} />
    </div>
  )
}
