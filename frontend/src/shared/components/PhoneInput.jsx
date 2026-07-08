import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { FieldError } from './FormPrimitives'
import {
  COUNTRY_PHONE_CODES,
  DEFAULT_PHONE_COUNTRY,
  getCountryByDialCode,
  normalizeNationalNumberForCountry,
  splitE164PhoneValue,
  toLocalNationalNumberForCountry,
} from '@shared/lib/countryPhoneCodes'
import { validatePhoneForCountry } from '@shared/lib/validation'

function formatNationalNumber(value) {
  const digits = String(value || '').replace(/\D/g, '')

  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`
}

function buildE164Value(countryOption, nationalNumber) {
  const digits = normalizeNationalNumberForCountry(nationalNumber, countryOption)

  return digits ? `${countryOption.dial_code}${digits}` : ''
}

export function PhoneInput({
  defaultCountryCode = DEFAULT_PHONE_COUNTRY.dial_code,
  disabled = false,
  error,
  name = 'phone',
  onBlur,
  onChange,
  placeholder,
  required = false,
  value,
}) {
  const wrapperRef = useRef(null)
  const dropdownRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [touched, setTouched] = useState(false)
  const [countryOverride, setCountryOverride] = useState(null)
  const [dropdownPosition, setDropdownPosition] = useState(null)
  const defaultCountry = getCountryByDialCode(defaultCountryCode)
  const parsedPhone = splitE164PhoneValue(value, defaultCountryCode)
  const selectedCountry = value
    ? parsedPhone.country || defaultCountry
    : countryOverride || defaultCountry
  const nationalNumber = parsedPhone.nationalNumber
  const displayNumber = toLocalNationalNumberForCountry(nationalNumber, selectedCountry)
  const localError =
    touched && nationalNumber
      ? validatePhoneForCountry(nationalNumber, selectedCountry)
      : null
  const visibleError = error || localError
  const resolvedPlaceholder = placeholder || selectedCountry.placeholder || '300 1234567'

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return COUNTRY_PHONE_CODES
    }

    return COUNTRY_PHONE_CODES.filter((countryOption) =>
      [
        countryOption.flag_emoji,
        countryOption.name,
        countryOption.dial_code,
        countryOption.iso2,
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
      if (
        !wrapperRef.current?.contains(event.target) &&
        !dropdownRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function updatePosition() {
      const rect = wrapperRef.current?.getBoundingClientRect()

      if (!rect) {
        return
      }

      const margin = 16
      const preferredWidth = 360
      const width = Math.min(
        Math.max(rect.width, 340),
        window.innerWidth - margin * 2,
        preferredWidth,
      )
      const left = Math.min(
        Math.max(rect.left, margin),
        window.innerWidth - width - margin,
      )
      const below = window.innerHeight - rect.bottom - margin
      const above = rect.top - margin
      const openUp = below < 240 && above > below
      const maxHeight = Math.max(180, Math.min(300, openUp ? above : below))
      const top = openUp
        ? Math.max(margin, rect.top - maxHeight - 6)
        : rect.bottom + 6

      setDropdownPosition({
        left,
        listMaxHeight: Math.max(120, maxHeight - 50),
        top,
        width,
      })
    }

    const frameId = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  function emitChange(nextCountry, nextNationalNumber) {
    onChange?.(buildE164Value(nextCountry, nextNationalNumber))
  }

  function emitBlur() {
    setTouched(true)
    onBlur?.(buildE164Value(selectedCountry, nationalNumber), {
      country: selectedCountry,
      name,
      nationalNumber,
    })
  }

  function handleCountrySelect(countryOption) {
    setCountryOverride(countryOption)
    emitChange(countryOption, nationalNumber)
    setOpen(false)
    setQuery('')
  }

  const countryDropdown =
    open && dropdownPosition && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed z-[10000] overflow-hidden rounded-card border border-hairline bg-canvas shadow-2xl"
            ref={dropdownRef}
            style={{
              left: dropdownPosition.left,
              top: dropdownPosition.top,
              width: dropdownPosition.width,
            }}
          >
            <div className="flex items-center gap-2 border-b border-hairline bg-mist px-3 py-2">
              <Search aria-hidden="true" className="h-4 w-4 text-slate" />
              <input
                autoFocus
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] text-ink outline-none placeholder:text-slate/50"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search country..."
                type="text"
                value={query}
              />
            </div>
            <div
              className="overflow-y-auto py-1"
              style={{ maxHeight: dropdownPosition.listMaxHeight }}
            >
              {filteredCountries.length === 0 ? (
                <p className="px-3 py-3 text-[13px] text-slate">No country found</p>
              ) : (
                filteredCountries.map((countryOption) => {
                  const selected =
                    countryOption.iso2 === selectedCountry.iso2 &&
                    countryOption.dial_code === selectedCountry.dial_code

                  return (
                    <button
                      className={[
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                        selected ? 'bg-brand-light text-brand' : 'text-ink',
                      ].join(' ')}
                      key={`${countryOption.iso2}-${countryOption.dial_code}`}
                      onClick={() => handleCountrySelect(countryOption)}
                      type="button"
                    >
                      <span aria-hidden="true" className="w-5 text-[16px] leading-none">
                        {countryOption.flag_emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                        {countryOption.name}
                      </span>
                      <span className="font-sans text-[12px] font-semibold text-slate">
                        {countryOption.dial_code}
                      </span>
                      {selected ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className={[
          'flex h-11 min-h-11 items-stretch overflow-hidden rounded-control border bg-mist/50 transition-all duration-150',
          visibleError
            ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-400/25'
            : 'border-hairline focus-within:border-brand focus-within:bg-canvas focus-within:ring-2 focus-within:ring-brand/25',
          disabled ? 'cursor-not-allowed opacity-70' : '',
        ].join(' ')}
      >
        <button
          aria-expanded={open}
          aria-label="Select country calling code"
          className="inline-flex w-[96px] shrink-0 items-center justify-between gap-1.5 border-r border-hairline bg-mist px-2.5 text-[13px] font-semibold text-ink transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true" className="text-[15px] leading-none">
              {selectedCountry.flag_emoji}
            </span>
            <span className="font-sans">{selectedCountry.dial_code}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-slate" />
        </button>

        <input
          aria-invalid={Boolean(visibleError)}
          autoComplete="tel-national"
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-slate/50"
          disabled={disabled}
          inputMode="tel"
          name={name}
          onBlur={emitBlur}
          onChange={(event) =>
            emitChange(selectedCountry, event.target.value.replace(/\D/g, ''))
          }
          onFocus={() => setOpen(false)}
          placeholder={resolvedPlaceholder}
          required={required}
          type="tel"
          value={formatNationalNumber(displayNumber)}
        />
      </div>

      {localError && !error ? <FieldError>{localError}</FieldError> : null}
      {countryDropdown}
    </div>
  )
}

export default PhoneInput
