import { useState, useEffect } from 'react'
import { CURRENCIES, getStoredCurrency, setStoredCurrency } from '@shared/lib/currency'

export default function CurrencySelect() {
  const [currency, setCurrency] = useState(getStoredCurrency())

  useEffect(() => {
    const onStorage = () => setCurrency(getStoredCurrency())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function handleChange(event) {
    const code = event.target.value
    setCurrency(code)
    setStoredCurrency(code)
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <select
      value={currency}
      onChange={handleChange}
      className="h-[32px] rounded-control border border-hairline bg-canvas px-2 text-[11px] font-medium text-ink outline-none transition-colors focus:border-brand"
      title="Currency"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} {c.symbol}
        </option>
      ))}
    </select>
  )
}

export function useCurrency() {
  const [currency, setCurrency] = useState(getStoredCurrency)

  useEffect(() => {
    const handler = () => setCurrency(getStoredCurrency())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return currency
}
