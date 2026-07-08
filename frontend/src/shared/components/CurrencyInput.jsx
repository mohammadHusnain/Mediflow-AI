import { forwardRef } from 'react'

import { useAuth } from '@shared/context/AuthContext'
import { getCurrency } from '@shared/lib/currency'

function getActiveCurrencyCode(organization, user) {
  return (
    organization?.currency_code ||
    user?.organization?.currency_code ||
    user?.organization_currency ||
    user?.currency_code ||
    undefined
  )
}

const CurrencyInput = forwardRef(function CurrencyInput(
  {
    className = '',
    inputClassName = '',
    min = '0',
    step = '0.01',
    type = 'number',
    ...inputProps
  },
  ref,
) {
  const { organization, user } = useAuth()
  const currency = getCurrency(getActiveCurrencyCode(organization, user))

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[14px] text-slate">
        {currency.symbol}
      </span>
      <input
        className={[
          'h-11 w-full rounded-control border border-hairline bg-mist/50 py-2.5 pl-10 pr-4 font-mono text-[14px] text-slate-900 outline-none transition-all duration-150 placeholder:text-slate/50 focus:border-brand focus:ring-2 focus:ring-brand/25',
          inputClassName,
        ].filter(Boolean).join(' ')}
        min={min}
        ref={ref}
        step={step}
        type={type}
        {...inputProps}
      />
    </div>
  )
})

export default CurrencyInput
