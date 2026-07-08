import { useAuth } from '@shared/context/AuthContext'
import { formatCurrencyAmount } from '@shared/lib/currency'

function getActiveCurrencyCode(organization, user) {
  return (
    organization?.currency_code ||
    user?.organization?.currency_code ||
    user?.organization_currency ||
    user?.currency_code ||
    undefined
  )
}

export default function CurrencyDisplay({ amount, className = '' }) {
  const { organization, user } = useAuth()

  return (
    <span className={`font-mono ${className}`}>
      {formatCurrencyAmount(amount, getActiveCurrencyCode(organization, user))}
    </span>
  )
}
