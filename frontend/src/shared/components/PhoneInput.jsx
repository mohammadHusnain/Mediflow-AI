import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { COUNTRY_CODES, CountryFlag } from './CountryCodeSelect'

function normalizeDialCode(value, fallback = '+92') {
  const code = String(value || '').trim()
  return code.startsWith('+') ? code : fallback
}

function findCountryByCode(code) {
  return (
    COUNTRY_CODES.find((country) => country.code === code) ||
    COUNTRY_CODES.find((country) => country.code === '+92') ||
    COUNTRY_CODES[0]
  )
}

function splitPhoneValue(value, defaultCountryCode = '+92') {
  const text = String(value || '').trim()
  const fallbackCode = normalizeDialCode(defaultCountryCode)
  const sortedCountries = [...COUNTRY_CODES].sort(
    (first, second) => second.code.length - first.code.length,
  )
  const matchedCountry = sortedCountries.find((country) => text.startsWith(country.code))
  const selectedCountry = matchedCountry || findCountryByCode(fallbackCode)
  const rawNumber = matchedCountry
    ? text.slice(matchedCountry.code.length)
    : text.replace(/^\+/, '')

  return {
    country: selectedCountry,
    number: rawNumber.replace(/\D/g, ''),
  }
}

function formatNationalNumber(value) {
  const digits = String(value || '').replace(/\D/g, '')

  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`
}

function buildPhoneValue(countryCode, number) {
  const digits = String(number || '').replace(/\D/g, '')
  return digits ? `${countryCode}${digits}` : ''
}

export function PhoneInput({
  defaultCountryCode = '+92',
  disabled = false,
  error,
  name = 'phone',
  onBlur,
  onChange,
  placeholder = '300 123 4567',
  required = false,
  value,
}) {
  const wrapperRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { country, number } = splitPhoneValue(value, defaultCountryCode)
  const selectedCountry = country || findCountryByCode(defaultCountryCode)
  const e164Value = buildPhoneValue(selectedCountry.code, number)

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return COUNTRY_CODES
    }

    return COUNTRY_CODES.filter((countryOption) =>
      [
        countryOption.country,
        countryOption.code,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [query])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open])

  function emitChange(nextCountryCode, nextNumber) {
    onChange?.({
      target: {
        name,
        value: buildPhoneValue(nextCountryCode, nextNumber),
      },
    })
  }

  function emitBlur() {
    onBlur?.({
      target: {
        name,
        value: e164Value,
      },
    })
  }

  function handleCountrySelect(countryOption) {
    emitChange(countryOption.code, number)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className={[
          'flex min-h-11 items-stretch overflow-hidden rounded-control border bg-mist/50 transition-all duration-150',
          error ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-400/25' : 'border-hairline focus-within:border-brand focus-within:bg-canvas focus-within:ring-2 focus-within:ring-brand/25',
          disabled ? 'cursor-not-allowed opacity-70' : '',
        ].join(' ')}
      >
        <button
          aria-expanded={open}
          aria-label="Select country calling code"
          className="inline-flex w-[124px] shrink-0 items-center justify-between gap-2 border-r border-hairline bg-canvas px-3 text-[13px] font-semibold text-ink transition hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <CountryFlag country={selectedCountry} />
            <span className="font-sans">{selectedCountry.code}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-slate" />
        </button>

        <input
          aria-invalid={Boolean(error)}
          autoComplete="tel-national"
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-slate/50"
          disabled={disabled}
          inputMode="tel"
          name={name}
          onBlur={emitBlur}
          onChange={(event) =>
            emitChange(selectedCountry.code, event.target.value.replace(/\D/g, ''))
          }
          placeholder={placeholder}
          required={required}
          type="tel"
          value={formatNationalNumber(number)}
        />
      </div>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-card border border-hairline bg-canvas shadow-2xl">
          <div className="flex items-center gap-2 border-b border-hairline bg-mist px-3 py-2">
            <Search aria-hidden="true" className="h-4 w-4 text-slate" />
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] text-ink outline-none placeholder:text-slate/50"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries..."
              type="search"
              value={query}
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filteredCountries.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-slate">No country found</p>
            ) : (
              filteredCountries.map((countryOption) => {
                const selected = countryOption.country === selectedCountry.country &&
                  countryOption.code === selectedCountry.code

                return (
                  <button
                    className={[
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                      selected ? 'bg-brand-light text-brand' : 'text-ink',
                    ].join(' ')}
                    key={`${countryOption.code}-${countryOption.country}`}
                    onClick={() => handleCountrySelect(countryOption)}
                    type="button"
                  >
                    <CountryFlag country={countryOption} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                      {countryOption.country}
                    </span>
                    <span className="font-sans text-[12px] font-semibold text-slate">
                      {countryOption.code}
                    </span>
                    {selected ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default PhoneInput
