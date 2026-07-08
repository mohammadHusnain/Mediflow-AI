export const CURRENCIES = [
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'LKR', symbol: 'රු', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'OMR', symbol: '﷼', name: 'Omani Rial', flag: '🇴🇲' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'EGP', symbol: '£', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳' },
]

export const DEFAULT_CURRENCY_CODE = 'PKR'
const STORAGE_KEY = 'mediflow_currency'
const ORG_STORAGE_KEY = 'org_currency'

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function getCurrency(code) {
  const normalized = normalizeCode(code)
  return CURRENCIES.find((currency) => currency.code === normalized) || getCurrency(DEFAULT_CURRENCY_CODE)
}

export const getCurrencyByCode = getCurrency

export function getStoredCurrency() {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_CURRENCY_CODE
  }

  try {
    const orgCurrency = normalizeCode(localStorage.getItem(ORG_STORAGE_KEY))
    if (orgCurrency && CURRENCIES.some((currency) => currency.code === orgCurrency)) {
      return orgCurrency
    }

    const storedCurrency = normalizeCode(localStorage.getItem(STORAGE_KEY))
    if (storedCurrency && CURRENCIES.some((currency) => currency.code === storedCurrency)) {
      return storedCurrency
    }
  } catch {
    // Storage access is best-effort only.
  }

  return DEFAULT_CURRENCY_CODE
}

export function setStoredCurrency(code) {
  const currency = getCurrency(code)

  if (typeof localStorage === 'undefined') {
    return currency.code
  }

  try {
    localStorage.setItem(STORAGE_KEY, currency.code)
    localStorage.setItem(ORG_STORAGE_KEY, currency.code)
  } catch {
    // Storage access is best-effort only.
  }

  return currency.code
}

export function formatCurrencyAmount(amount, currencyCode, options = {}) {
  const currency = getCurrency(currencyCode || getStoredCurrency())
  const number = Number(amount)
  const safeNumber = Number.isFinite(number) ? number : 0
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(safeNumber)

  return `${currency.symbol} ${formatted}`
}

export function formatCurrency(amount, currencyCode) {
  return formatCurrencyAmount(amount, currencyCode)
}

export function formatCurrencyShort(amount, currencyCode) {
  return formatCurrencyAmount(amount, currencyCode, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function getCurrencySymbol(code) {
  return getCurrency(code || getStoredCurrency()).symbol
}

export function getCurrencyCode() {
  return getStoredCurrency()
}
