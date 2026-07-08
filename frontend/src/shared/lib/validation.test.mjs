import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  COUNTRY_PHONE_CODES,
  normalizeNationalNumberForCountry,
  splitE164PhoneValue,
  toLocalNationalNumberForCountry,
} from './countryPhoneCodes.js'
import {
  validatePhone,
  validatePhoneForCountry,
} from './validation.js'

describe('phone validation helpers', () => {
  test('parses existing E.164 values into country and national number', () => {
    const parsed = splitE164PhoneValue('+923001234567')

    assert.equal(parsed.country.iso2, 'PK')
    assert.equal(parsed.nationalNumber, '3001234567')
  })

  test('validates national digit count for the selected country', () => {
    const pakistan = COUNTRY_PHONE_CODES.find((country) => country.iso2 === 'PK')

    assert.equal(validatePhoneForCountry('3001234567', pakistan), null)
    assert.equal(validatePhoneForCountry('03001234567', pakistan), null)
    assert.match(
      validatePhoneForCountry('300123', pakistan),
      /Phone number for Pakistan must have 10 or 11 digits/,
    )
  })

  test('normalizes Pakistan local 11 digit numbers to E.164 national digits', () => {
    const pakistan = COUNTRY_PHONE_CODES.find((country) => country.iso2 === 'PK')

    assert.equal(
      normalizeNationalNumberForCountry('0300 1234567', pakistan),
      '3001234567',
    )
    assert.equal(
      toLocalNationalNumberForCountry('3001234567', pakistan),
      '03001234567',
    )
  })

  test('keeps E.164 validation while applying country digit rules', () => {
    assert.equal(validatePhone('+923001234567'), null)
    assert.equal(validatePhone('+9203001234567'), null)
    assert.match(validatePhone('+92300123'), /Phone number for Pakistan/)
    assert.match(validatePhone('03001234567'), /E.164 format/)
  })
})
