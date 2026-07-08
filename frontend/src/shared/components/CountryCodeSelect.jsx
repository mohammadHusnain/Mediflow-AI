import { COUNTRY_PHONE_CODES } from '@shared/lib/countryPhoneCodes'

const COUNTRY_CODES = COUNTRY_PHONE_CODES.map((country) => ({
  code: country.dial_code,
  country: country.name,
  flag_emoji: country.flag_emoji,
  iso2: country.iso2,
}))

export function CountryFlag({ className = '', country }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex h-4 w-5 shrink-0 items-center justify-center text-[15px] leading-none',
        className,
      ].join(' ')}
    >
      {country?.flag_emoji || '--'}
    </span>
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
        <option key={`${country.iso2}-${country.code}`} value={country.code}>
          {country.flag_emoji} {country.code}
        </option>
      ))}
    </select>
  )
}

export { COUNTRY_CODES }
