import { useState } from 'react'

const COUNTRY_CODES = [
  { code: '+93', country: 'Afghanistan', iso2: 'AF' },
  { code: '+355', country: 'Albania', iso2: 'AL' },
  { code: '+213', country: 'Algeria', iso2: 'DZ' },
  { code: '+54', country: 'Argentina', iso2: 'AR' },
  { code: '+61', country: 'Australia', iso2: 'AU' },
  { code: '+43', country: 'Austria', iso2: 'AT' },
  { code: '+973', country: 'Bahrain', iso2: 'BH' },
  { code: '+880', country: 'Bangladesh', iso2: 'BD' },
  { code: '+32', country: 'Belgium', iso2: 'BE' },
  { code: '+55', country: 'Brazil', iso2: 'BR' },
  { code: '+359', country: 'Bulgaria', iso2: 'BG' },
  { code: '+1', country: 'Canada', iso2: 'CA' },
  { code: '+56', country: 'Chile', iso2: 'CL' },
  { code: '+86', country: 'China', iso2: 'CN' },
  { code: '+57', country: 'Colombia', iso2: 'CO' },
  { code: '+385', country: 'Croatia', iso2: 'HR' },
  { code: '+420', country: 'Czech Republic', iso2: 'CZ' },
  { code: '+45', country: 'Denmark', iso2: 'DK' },
  { code: '+20', country: 'Egypt', iso2: 'EG' },
  { code: '+358', country: 'Finland', iso2: 'FI' },
  { code: '+33', country: 'France', iso2: 'FR' },
  { code: '+49', country: 'Germany', iso2: 'DE' },
  { code: '+233', country: 'Ghana', iso2: 'GH' },
  { code: '+30', country: 'Greece', iso2: 'GR' },
  { code: '+852', country: 'Hong Kong', iso2: 'HK' },
  { code: '+36', country: 'Hungary', iso2: 'HU' },
  { code: '+91', country: 'India', iso2: 'IN' },
  { code: '+62', country: 'Indonesia', iso2: 'ID' },
  { code: '+98', country: 'Iran', iso2: 'IR' },
  { code: '+964', country: 'Iraq', iso2: 'IQ' },
  { code: '+353', country: 'Ireland', iso2: 'IE' },
  { code: '+972', country: 'Israel', iso2: 'IL' },
  { code: '+39', country: 'Italy', iso2: 'IT' },
  { code: '+81', country: 'Japan', iso2: 'JP' },
  { code: '+962', country: 'Jordan', iso2: 'JO' },
  { code: '+7', country: 'Kazakhstan', iso2: 'KZ' },
  { code: '+254', country: 'Kenya', iso2: 'KE' },
  { code: '+965', country: 'Kuwait', iso2: 'KW' },
  { code: '+961', country: 'Lebanon', iso2: 'LB' },
  { code: '+218', country: 'Libya', iso2: 'LY' },
  { code: '+60', country: 'Malaysia', iso2: 'MY' },
  { code: '+52', country: 'Mexico', iso2: 'MX' },
  { code: '+212', country: 'Morocco', iso2: 'MA' },
  { code: '+95', country: 'Myanmar', iso2: 'MM' },
  { code: '+977', country: 'Nepal', iso2: 'NP' },
  { code: '+31', country: 'Netherlands', iso2: 'NL' },
  { code: '+64', country: 'New Zealand', iso2: 'NZ' },
  { code: '+234', country: 'Nigeria', iso2: 'NG' },
  { code: '+47', country: 'Norway', iso2: 'NO' },
  { code: '+968', country: 'Oman', iso2: 'OM' },
  { code: '+92', country: 'Pakistan', iso2: 'PK' },
  { code: '+51', country: 'Peru', iso2: 'PE' },
  { code: '+63', country: 'Philippines', iso2: 'PH' },
  { code: '+48', country: 'Poland', iso2: 'PL' },
  { code: '+351', country: 'Portugal', iso2: 'PT' },
  { code: '+974', country: 'Qatar', iso2: 'QA' },
  { code: '+40', country: 'Romania', iso2: 'RO' },
  { code: '+7', country: 'Russia', iso2: 'RU' },
  { code: '+966', country: 'Saudi Arabia', iso2: 'SA' },
  { code: '+65', country: 'Singapore', iso2: 'SG' },
  { code: '+27', country: 'South Africa', iso2: 'ZA' },
  { code: '+82', country: 'South Korea', iso2: 'KR' },
  { code: '+34', country: 'Spain', iso2: 'ES' },
  { code: '+94', country: 'Sri Lanka', iso2: 'LK' },
  { code: '+249', country: 'Sudan', iso2: 'SD' },
  { code: '+46', country: 'Sweden', iso2: 'SE' },
  { code: '+41', country: 'Switzerland', iso2: 'CH' },
  { code: '+886', country: 'Taiwan', iso2: 'TW' },
  { code: '+255', country: 'Tanzania', iso2: 'TZ' },
  { code: '+66', country: 'Thailand', iso2: 'TH' },
  { code: '+216', country: 'Tunisia', iso2: 'TN' },
  { code: '+90', country: 'Turkey', iso2: 'TR' },
  { code: '+256', country: 'Uganda', iso2: 'UG' },
  { code: '+380', country: 'Ukraine', iso2: 'UA' },
  { code: '+971', country: 'UAE', iso2: 'AE' },
  { code: '+44', country: 'United Kingdom', iso2: 'GB' },
  { code: '+1', country: 'United States', iso2: 'US' },
  { code: '+998', country: 'Uzbekistan', iso2: 'UZ' },
  { code: '+58', country: 'Venezuela', iso2: 'VE' },
  { code: '+84', country: 'Vietnam', iso2: 'VN' },
  { code: '+967', country: 'Yemen', iso2: 'YE' },
]

export function CountryFlag({ className = '', country }) {
  const [failed, setFailed] = useState(false)
  const iso2 = String(country?.iso2 || '').toLowerCase()
  const fallback = String(country?.iso2 || country?.country || '--')
    .slice(0, 2)
    .toUpperCase()

  if (!iso2 || failed) {
    return (
      <span
        aria-hidden="true"
        className={[
          'inline-flex h-4 w-5 shrink-0 items-center justify-center rounded-[2px] border border-hairline bg-mist font-sans text-[8px] font-bold leading-none text-slate',
          className,
        ].join(' ')}
      >
        {fallback}
      </span>
    )
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={[
        'h-4 w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(20,24,31,0.12)]',
        className,
      ].join(' ')}
      onError={() => setFailed(true)}
      src={`https://flagcdn.com/w40/${iso2}.png`}
      srcSet={`https://flagcdn.com/w40/${iso2}.png 1x, https://flagcdn.com/w80/${iso2}.png 2x`}
    />
  )
}

export default function CountryCodeSelect({ value, onChange, name, onBlur }) {
  return (
    <select
      className="h-11 w-[100px] shrink-0 rounded-control border border-hairline bg-canvas px-2 text-[12px] font-medium text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
      name={name || 'country_code'}
      value={value || '+92'}
      onChange={onChange}
      onBlur={onBlur}
    >
      {COUNTRY_CODES.map((country) => (
        <option key={`${country.code}-${country.country}`} value={country.code}>
          {country.iso2} {country.code}
        </option>
      ))}
    </select>
  )
}

export { COUNTRY_CODES }
